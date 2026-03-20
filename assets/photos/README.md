# Photos Directory

This directory contains the photos that will be displayed in your 3D gallery.

## Adding Your Photos

1. **Copy your photos** into this directory (`assets/photos/`)
2. **Supported formats**: JPG, JPEG, PNG, WebP
3. **Recommended size**: 1920x1080 or higher for best quality
4. **File naming**: Use descriptive names (e.g., `mountain-sunset.jpg`, `urban-portrait.png`)

## Generating the Photo Manifest

After adding your photos, run the following command to generate the photo manifest:

```bash
npm run generate-manifest
```

This will scan this directory and create a `photo-manifest.json` file that the gallery uses to load your photos.

## Photo Metadata

The gallery will automatically generate basic metadata for your photos. For more detailed information, you can manually edit the `photo-manifest.json` file to add:

- Custom titles and descriptions
- Camera settings (aperture, shutter speed, ISO)
- Tags for categorization
- Date information

## Example Photo Manifest Entry

```json
{
  "id": "mountain_sunset_1",
  "path": "./assets/photos/mountain-sunset.jpg",
  "metadata": {
    "title": "Mountain Sunset",
    "description": "A breathtaking sunset over the mountain range",
    "date": "2024-03-13",
    "camera": "Canon EOS R5",
    "settings": {
      "aperture": "f/8",
      "shutter": "1/125s",
      "iso": "100"
    },
    "tags": ["landscape", "sunset", "mountains", "nature"]
  }
}
```

## Performance Tips

- **Optimize file sizes**: Large files (>5MB) may slow down loading
- **Use WebP format** when possible for better compression
- **Consistent aspect ratios** work best for the table layout
- **Limit to 20-50 photos** for optimal performance

## Getting Started

If this is your first time:

1. Add a few test photos to this directory
2. Run `npm run generate-manifest`
3. Start the development server with `npm run dev`
4. Your photos will appear scattered on the marble table in the 3D gallery!

Enjoy your immersive photo gallery experience! 📸✨
