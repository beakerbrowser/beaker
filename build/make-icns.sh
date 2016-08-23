mkdir icon.iconset
cp icons/1024x1024.png Icon1024.png
sips -z 16 16     Icon1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32     Icon1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     Icon1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64     Icon1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   Icon1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256   Icon1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   Icon1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512   Icon1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   Icon1024.png --out icon.iconset/icon_512x512.png
cp Icon1024.png icon.iconset/icon_512x512@2x.png
iconutil -c icns --output icon.icns icon.iconset
rm -R icon.iconset
rm Icon1024.png