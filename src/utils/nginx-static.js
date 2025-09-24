require('dotenv').config()
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const NGINX_PATH = process.env.NGINX_PATH

async function createStaticConf(conversation_id, dir_path) {
    if (!conversation_id || !dir_path) throw new Error('conversation_id和dir_path不能为空');
    if (!NGINX_PATH) throw new Error('NGINX_PATH未设置');
    
    const subdomain = `${conversation_id.slice(0, 8)}-static.lemonai.ai`;
    const filename = `${conversation_id.slice(0, 8)}-static.lemonai.ai.conf`;
    const filePath = path.join(NGINX_PATH, filename);
    
    const conf = `server {
    listen 443 ssl;
    server_name ${subdomain};

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

    # 字符集设置
    charset utf-8;
    
    # 静态文件服务配置
    location / {
        root ${dir_path};
        index index.html index.htm;
        
        # 允许直接访问文件
        try_files $uri $uri/ =404;
        
        # 文件缓存配置
        location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # HTML文件不缓存
        location ~* \\.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        
        # 安全配置
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        
        # 自动索引（可选，显示目录结构）
        autoindex on;
        autoindex_exact_size off;
        autoindex_localtime on;
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
                resolve({ 
                    filePath, 
                    subdomain,
                    url: `https://${subdomain}`,
                    reload: true, 
                    stdout 
                });
            }
        });
    });
}

async function deleteStaticConf(conversation_id) {
    if (!conversation_id) throw new Error('conversation_id不能为空');
    if (!NGINX_PATH) throw new Error('NGINX_PATH未设置');
    
    const filename = `${conversation_id.slice(0, 8)}-static.lemonai.ai.conf`;
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

module.exports = exports = { createStaticConf, deleteStaticConf };