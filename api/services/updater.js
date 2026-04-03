// ═══════════════════════════════════
//        Atom Auto-Update Service
// ═══════════════════════════════════

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const GITHUB_REPO = 'venaciteam/atom-discord';
const CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12h
const GITHUB_TIMEOUT = 10000; // 10s

let versionCache = null; // { local, remote, releaseUrl, checkedAt }
let updating = false;
let periodicTimer = null;

// ═══ Helpers ═══

function getLocalVersion() {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
    return pkg.version;
}

function isDocker() {
    return fs.existsSync('/.dockerenv');
}

function getEnvironment() {
    if (!isDocker()) return { type: 'native', ready: true };

    const hostDir = process.env.ATOM_HOST_DIR;
    const socketOk = fs.existsSync('/var/run/docker.sock');

    return {
        type: 'docker',
        ready: !!(hostDir && socketOk),
        hostDir: hostDir || null,
        socketOk
    };
}

function compareVersions(a, b) {
    const pa = a.replace(/^v/, '').split('.').map(Number);
    const pb = b.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) < (pb[i] || 0)) return -1;
        if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    }
    return 0;
}

// ═══ Version Check ═══

async function fetchLatestRelease() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GITHUB_TIMEOUT);

    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
            headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Atom-Bot' },
            signal: controller.signal
        });

        if (res.status === 404) return null; // pas encore de release
        if (!res.ok) return null;

        const data = await res.json();
        return {
            version: data.tag_name?.replace(/^v/, '') || null,
            url: data.html_url,
            notes: data.body || '',
            date: data.published_at
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

async function checkVersion(force = false) {
    const now = Date.now();
    if (!force && versionCache && (now - versionCache.checkedAt) < CHECK_INTERVAL) {
        return versionCache;
    }

    const local = getLocalVersion();
    const release = await fetchLatestRelease();
    const remote = release?.version || null;
    const env = getEnvironment();

    versionCache = {
        local,
        remote,
        releaseUrl: release?.url || null,
        releaseNotes: release?.notes || null,
        releaseDate: release?.date || null,
        updateAvailable: remote ? compareVersions(local, remote) < 0 : false,
        environment: env.type,
        environmentReady: env.ready,
        checkedAt: now
    };

    return versionCache;
}

// ═══ Update Execution ═══

function runUpdate(onLog) {
    if (updating) {
        onLog('error', 'Une mise à jour est déjà en cours.');
        onLog('fail', 'Annulé.');
        return;
    }

    updating = true;
    const env = getEnvironment();

    if (env.type === 'docker') {
        runDockerUpdate(env, onLog);
    } else {
        runNativeUpdate(onLog);
    }
}

function spawnStep(cmd, args, options, onLog) {
    return new Promise((resolve, reject) => {
        onLog('log', `$ ${cmd} ${args.join(' ')}`);
        const proc = spawn(cmd, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });

        proc.stdout.on('data', chunk => {
            chunk.toString().split('\n').filter(Boolean).forEach(line => onLog('log', line));
        });

        proc.stderr.on('data', chunk => {
            chunk.toString().split('\n').filter(Boolean).forEach(line => onLog('log', line));
        });

        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`Exit code ${code}`));
        });

        proc.on('error', err => reject(err));
    });
}

async function runNativeUpdate(onLog) {
    const appDir = path.join(__dirname, '..', '..');
    let previousCommit;

    try {
        // Sauvegarder le commit actuel pour rollback
        previousCommit = execSync('git rev-parse HEAD', { cwd: appDir }).toString().trim();
        onLog('status', 'Mise à jour du code source...');

        // git pull --ff-only (safe, pas de merge)
        await spawnStep('git', ['pull', '--ff-only', 'origin', 'main'], { cwd: appDir }, onLog);

        // npm ci
        onLog('status', 'Installation des dépendances...');
        await spawnStep('npm', ['ci', '--omit=dev'], { cwd: appDir }, onLog);

        onLog('status', 'Redémarrage...');
        onLog('done', 'Mise à jour terminée. Atom redémarre...');

        // Laisser le temps au SSE d'envoyer le dernier message
        setTimeout(() => {
            updating = false;
            process.exit(0); // le process manager (systemd/pm2) redémarre
        }, 1500);

    } catch (err) {
        onLog('error', `Erreur : ${err.message}`);

        // Rollback
        if (previousCommit) {
            onLog('status', 'Rollback en cours...');
            try {
                await spawnStep('git', ['reset', '--hard', previousCommit], { cwd: appDir }, onLog);
                await spawnStep('npm', ['ci', '--omit=dev'], { cwd: appDir }, onLog);
                onLog('log', 'Rollback terminé — version précédente restaurée.');
            } catch (rbErr) {
                onLog('error', `Erreur pendant le rollback : ${rbErr.message}`);
            }
        }

        onLog('fail', 'Mise à jour échouée. Rollback appliqué.');
        updating = false;
    }
}

async function runDockerUpdate(env, onLog) {
    if (!env.ready) {
        onLog('error', 'Configuration Docker incomplète.');
        if (!env.hostDir) onLog('error', 'Variable ATOM_HOST_DIR manquante (montez le source host dans docker-compose.yml).');
        if (!env.socketOk) onLog('error', 'Docker socket non monté (/var/run/docker.sock).');
        onLog('fail', 'Impossible de lancer la mise à jour.');
        updating = false;
        return;
    }

    const hostDir = env.hostDir;
    let previousCommit;

    try {
        // Sauvegarder le commit actuel
        previousCommit = execSync('git rev-parse HEAD', { cwd: hostDir }).toString().trim();
        onLog('status', 'Mise à jour du code source...');

        // git pull sur le source host monté
        await spawnStep('git', ['pull', '--ff-only', 'origin', 'main'], { cwd: hostDir }, onLog);

        // Rebuild Docker image
        onLog('status', 'Reconstruction de l\'image Docker...');
        const containerName = process.env.HOSTNAME || 'atom';
        // Trouver le nom de l'image du container actuel
        const imageName = execSync(`docker inspect --format='{{.Config.Image}}' ${containerName}`, { cwd: hostDir }).toString().trim();
        await spawnStep('docker', ['build', '-t', imageName, hostDir], { cwd: hostDir }, onLog);

        // Restart container avec la nouvelle image
        onLog('status', 'Redémarrage du container...');
        onLog('done', 'Image reconstruite. Le container redémarre...');

        // Laisser le SSE envoyer, puis relancer
        setTimeout(() => {
            updating = false;
            // Stop + remove + recreate avec les mêmes params
            const restart = spawn('sh', ['-c', `docker stop ${containerName} && docker rm ${containerName} && docker run -d --name ${containerName} --restart unless-stopped --env-file ${hostDir}/.env -e ATOM_HOST_DIR=/host-app -p \${PORT:-3050}:\${PORT:-3050} -v atom-data:/app/data -v /var/run/docker.sock:/var/run/docker.sock -v ${hostDir}:/host-app --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 ${imageName}`], {
                cwd: hostDir,
                stdio: 'ignore',
                detached: true
            });
            restart.unref();
        }, 1500);

    } catch (err) {
        onLog('error', `Erreur : ${err.message}`);

        // Rollback
        if (previousCommit) {
            onLog('status', 'Rollback en cours...');
            try {
                await spawnStep('git', ['reset', '--hard', previousCommit], { cwd: hostDir }, onLog);
                onLog('log', 'Code source restauré.');
            } catch (rbErr) {
                onLog('error', `Erreur pendant le rollback : ${rbErr.message}`);
            }
        }

        onLog('fail', 'Mise à jour échouée. Rollback appliqué.');
        updating = false;
    }
}

// ═══ Periodic Check ═══

function startPeriodicCheck() {
    // Check initial
    checkVersion().then(result => {
        if (result?.updateAvailable) {
            console.log(`[Atom] Mise à jour disponible : v${result.local} → v${result.remote}`);
        }
    }).catch(() => {});

    // Check toutes les 12h
    periodicTimer = setInterval(() => {
        checkVersion(true).catch(() => {});
    }, CHECK_INTERVAL);
}

function isUpdating() {
    return updating;
}

module.exports = { checkVersion, runUpdate, startPeriodicCheck, isUpdating, getEnvironment, getLocalVersion };
