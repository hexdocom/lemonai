require('dotenv').config();
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { config } = require('dotenv');
const path = require('path');

module.exports = {
  packagerConfig: {
    prune: true,
    asar: true,
    icon: path.resolve(__dirname, 'frontend/src/assets/icon'),
    // {
    //   unpackDir: "bin" // 解压 bin 目录到 app.asar.unpacked
    // },
    ignore: [
      /^\/node_modules\/\.bin/,
      /^\/tests/,
      /^\/docs/,
      /README\.md/,
      /\.(log|tmp|bak)$/, // 忽略日志、临时文件
      /\.(cache|ds_store)$/, // 忽略 macOS 缓存文件
      /^\/\.git/, // 忽略 Git 目录
      /^\/out/, // 忽略构建目录
      /^\/dist/, // 忽略其他构建目录
      /^\/frontend\/node_modules\/.*/, // 忽略前端的 node_modules
      /^\/frontend\/src\/.*/, // 忽略前端源码
    ],
    extraResource: [
      "./data",
      "./cache",
      "./workspace",
      "./.env",
      "./resources/browser" // copy browser to resources
    ],
    osxSign: {
      identity: "Developer ID Application: Beijing Yichuang Technology Co.,Ltd. (6P6VT3LT4F)",
      "hardenedRuntime": true,
      'entitlements': './entitlements.plist',
      "entitlementsInherit": "./entitlements.plist",
      "gatekeeper-assess": false,
      optionsForFile: (filePath) => {
        return { entitlements: './entitlements.plist' };
      }
    },
    osxNotarize: {
      tool: "notarytool",
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      // platforms: ['win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // 主进程配置
        build: [
          {
            entry: 'main.js', // 主进程入口（后端代码）
            config: 'vite.main.config.js', // 主进程 Vite 配置文件
          },
          {
            entry: 'preload.js', // 预加载脚本入口
            config: 'vite.preload.config.js', // 预加载 Vite 配置文件
          },
        ],
        // 渲染进程配置
        renderer: [
          {
            name: 'main_window',
            config: 'frontend/vite.config.js', // 前端 Vite 配置文件
          },
        ],
      },
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
    }),
  ],
};
