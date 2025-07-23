/**
 * PWA图标生成脚本
 * 用于生成不同尺寸的PWA图标
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 源图标路径
const SOURCE_ICON = path.join(__dirname, '../src/image/logo/logo-T.png');

// 目标目录
const ICONS_DIR = path.join(__dirname, '../public/icons');

// 确保目标目录存在
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 需要生成的图标尺寸
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// 生成图标
async function generateIcons() {
  try {
    // 检查源图标是否存在
    if (!fs.existsSync(SOURCE_ICON)) {
      console.error(`源图标不存在: ${SOURCE_ICON}`);
      process.exit(1);
    }

    console.log(`开始生成PWA图标...`);
    console.log(`源图标: ${SOURCE_ICON}`);
    console.log(`目标目录: ${ICONS_DIR}`);

    // 生成不同尺寸的图标
    for (const size of ICON_SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
      
      await sharp(SOURCE_ICON)
        .resize(size, size)
        .png({ quality: 90 })
        .toFile(outputPath);
      
      console.log(`生成图标: ${outputPath}`);
    }

    // 生成Apple Touch Icon
    await sharp(SOURCE_ICON)
      .resize(180, 180)
      .png({ quality: 90 })
      .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
    
    console.log(`生成图标: apple-touch-icon.png`);

    // 生成favicon.ico
    await sharp(SOURCE_ICON)
      .resize(32, 32)
      .toFile(path.join(ICONS_DIR, 'favicon.ico'));
    
    console.log(`生成图标: favicon.ico`);

    // 生成离线图片占位符
    await sharp(SOURCE_ICON)
      .resize(100, 100)
      .blur(5)
      .grayscale()
      .toFile(path.join(ICONS_DIR, 'offline-image.png'));
    
    console.log(`生成图标: offline-image.png`);

    // 生成通知徽章
    await sharp(SOURCE_ICON)
      .resize(72, 72)
      .toFile(path.join(ICONS_DIR, 'badge-72x72.png'));
    
    console.log(`生成图标: badge-72x72.png`);

    console.log('所有PWA图标生成完成!');
  } catch (error) {
    console.error('生成PWA图标时出错:', error);
    process.exit(1);
  }
}

// 执行生成
generateIcons();