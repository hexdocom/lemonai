require('dotenv').config()
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const NGINX_PATH = process.env.NGINX_PATH

async function createConf(host, user_id) {
    if (!host || !user_id) throw new Error('host和user_id不能为空');
    if (!NGINX_PATH) throw new Error('NGINX_PATH未设置');
    const filename = `${user_id}-vscode.lemonai.ai.conf`;
    const filePath = path.join(NGINX_PATH, filename);
    const conf = `server {
    listen 443 ssl;
    server_name ${user_id}-vscode.lemonai.ai;

    ssl_certificate /root/.acme.sh/lemonai.ai_ecc/fullchain.cer;
    ssl_certificate_key /root/.acme.sh/lemonai.ai_ecc/lemonai.ai.key;

    ssl_protocols TLSv1.2 TLSv1.3;

    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA256:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!aECDH:!EDH-DSS-DES-CBC3-SHA:!EDH-RSA-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA';

    ssl_prefer_server_ciphers on;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off; 
    ssl_stapling on; 
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s; 
    resolver_timeout 5s;

    location / {
        proxy_pass http://${host}:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
    await fs.promises.writeFile(filePath, conf, 'utf8');
    // reload nginx
    return new Promise((resolve, reject) => {
        exec('nginx -s reload', (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`nginx reload failed: ${stderr || error.message}`));
            } else {
                resolve({ filePath, reload: true, stdout });
            }
        });
    });
}

async function deleteConf(user_id) {
    if (!user_id) throw new Error('user_id不能为空');
    if (!NGINX_PATH) throw new Error('NGINX_PATH未设置');
    const filename = `${user_id}-vscode.lemonai.ai.conf`;
    const filePath = path.join(NGINX_PATH, filename);
    try {
        await fs.promises.unlink(filePath);
    } catch (err) {
        if (err.code === 'ENOENT') {
            // 文件不存在，视为成功
        } else {
            throw err;
        }
    }
    // reload nginx
    return new Promise((resolve, reject) => {
        exec('nginx -s reload', (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`nginx reload failed: ${stderr || error.message}`));
            } else {
                resolve({ filePath, deleted: true, reload: true, stdout });
            }
        });
    });
}

module.exports = exports = { createConf, deleteConf };