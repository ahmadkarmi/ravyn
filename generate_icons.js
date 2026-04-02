const sharp = require('sharp');
const path = require('path');

async function processIcons() {
    try {
        const sourcePath = path.join(__dirname, 'assets', 'source_icon.png');

        // 1024x1024 for iOS Store & Expo base
        await sharp(sourcePath)
            .resize(1024, 1024, { fit: 'cover' })
            .toFile(path.join(__dirname, 'assets', 'store_assets', 'ios_icon_1024.png'));
            
        await sharp(sourcePath)
            .resize(1024, 1024, { fit: 'cover' })
            .toFile(path.join(__dirname, 'assets', 'icon.png')); // Update Expo's main icon

        // 512x512 for Google Play Store
        await sharp(sourcePath)
            .resize(512, 512, { fit: 'cover' })
            .toFile(path.join(__dirname, 'assets', 'store_assets', 'play_icon_512.png'));

        // Adaptive Icon Foreground (1024x1024)
        await sharp(sourcePath)
            .resize(1024, 1024, { fit: 'cover' })
            .toFile(path.join(__dirname, 'assets', 'adaptive-icon.png'));

        // Splash screen (1284x2778) - centered icon with background
        await sharp({
            create: {
                width: 1284,
                height: 2778,
                channels: 4,
                background: { r: 242, g: 234, b: 222, alpha: 1 } // Match the beige background from the icon
            }
        })
        .composite([{ input: sourcePath, gravity: 'center' }])
        .png()
        .toFile(path.join(__dirname, 'assets', 'splash-icon.png'));

        console.log('✅ Icons generated successfully!');
    } catch (err) {
        console.error('Error generating icons:', err);
    }
}

processIcons();
