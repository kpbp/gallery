# 3D Photo Gallery

A stunning, interactive 3D photo gallery built with Three.js that displays your photos scattered on a marble table in a museum-like environment. Users can drag photos around, click to view them up close, and navigate the 3D space with intuitive controls.

![3D Photo Gallery Preview](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=3D+Photo+Gallery)

## ✨ Features

- **🏛️ Museum-Quality Environment**: Realistic gallery room with marble table and professional lighting
- **📸 Interactive Photos**: Drag and drop photos around the table surface
- **🔍 Photo Viewing**: Click photos to lift and rotate them for detailed viewing
- **🎮 3D Navigation**: Smooth camera controls to explore the gallery space
- **📱 Mobile Friendly**: Touch-optimized interactions for mobile devices
- **⚡ High Performance**: Optimized rendering with LOD system and efficient asset loading
- **🎨 Realistic Materials**: PBR materials with proper lighting and shadows
- **🔄 Dynamic Loading**: Automatically loads photos from your assets folder

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Modern web browser with WebGL support

### Installation

1. **Clone or download** this project
2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Add your photos** to the `assets/photos/` directory
   - Supported formats: JPG, JPEG, PNG, WebP
   - Recommended size: 1920x1080 or higher

4. **Generate photo manifest**:

   ```bash
   npm run generate-manifest
   ```

5. **Start the development server**:

   ```bash
   npm run dev
   ```

6. **Open your browser** to `http://localhost:3000`

## 📁 Project Structure

```
gallery2/
├── src/
│   ├── core/
│   │   └── GalleryApp.js          # Main application orchestrator
│   ├── scene/
│   │   └── SceneManager.js        # 3D scene management
│   ├── environment/
│   │   ├── GalleryRoom.js         # Museum room creation
│   │   ├── MarbleTable.js         # Realistic marble table
│   │   └── MuseumLighting.js      # Professional lighting setup
│   ├── photos/
│   │   ├── PhotoManager.js        # Photo loading and management
│   │   ├── PhotoLoader.js         # Dynamic photo loading
│   │   ├── PhotoMesh.js           # Individual photo objects
│   │   └── PhotoScatterer.js      # Natural photo placement algorithm
│   ├── interaction/
│   │   └── InteractionManager.js  # Drag-drop and selection handling
│   ├── ui/
│   │   ├── UIManager.js           # User interface management
│   │   ├── LoadingManager.js      # Loading screen handling
│   │   └── ErrorHandler.js       # Error display and recovery
│   └── utils/
│       └── EventEmitter.js       # Event system for components
├── assets/
│   ├── photos/                    # Your photo files go here
│   └── photo-manifest.json       # Auto-generated photo metadata
├── styles/
│   └── main.css                   # Application styling
└── index.html                     # Main HTML file
```

## 🎮 Controls

### Desktop

- **Mouse drag**: Orbit around the gallery
- **Mouse wheel**: Zoom in/out
- **Click photo**: Select and view up close
- **Drag photo**: Move photos around the table
- **ESC**: Deselect photo
- **R**: Reset camera view
- **S**: Shuffle photo positions

### Mobile

- **Touch drag**: Orbit around the gallery
- **Pinch**: Zoom in/out
- **Tap photo**: Select and view up close
- **Drag photo**: Move photos around the table

### UI Controls

- **🔄 Reset View**: Return camera to default position
- **🔀 Shuffle**: Randomly rearrange photos on table
- **⛶ Fullscreen**: Toggle fullscreen mode

## 🛠️ Customization

### Adding Photos

1. Copy your photos to `assets/photos/`
2. Run `npm run generate-manifest` to update the photo list
3. Refresh the browser to see your new photos

### Photo Metadata

Edit `assets/photo-manifest.json` to customize:

- Photo titles and descriptions
- Camera settings (aperture, shutter, ISO)
- Tags for categorization
- Custom dates

### Environment Settings

Modify the environment in `src/environment/`:

- **Room dimensions**: Edit `GalleryRoom.js`
- **Table size/material**: Edit `MarbleTable.js`
- **Lighting setup**: Edit `MuseumLighting.js`

### Performance Tuning

Adjust settings in `src/core/GalleryApp.js`:

- Shadow quality
- Texture resolution
- LOD distances
- Photo count limits

## 🎨 Technical Features

### Realistic Rendering

- **PBR Materials**: Physically-based rendering for realistic surfaces
- **Soft Shadows**: High-quality shadow mapping with PCF filtering
- **Tone Mapping**: ACES filmic tone mapping for cinematic look
- **Proper Lighting**: Museum-quality lighting with multiple light sources

### Performance Optimization

- **Level of Detail (LOD)**: Automatic quality adjustment based on distance
- **Frustum Culling**: Only render visible objects
- **Texture Compression**: Optimized texture loading and caching
- **Efficient Scattering**: Poisson disk sampling for natural photo placement

### Interaction System

- **Raycasting**: Precise object picking and interaction
- **Physics Constraints**: Photos stay within table bounds
- **Smooth Animations**: Eased transitions for all movements
- **Touch Support**: Full mobile device compatibility

## 📊 Browser Support

- **Chrome 90+** ✅
- **Firefox 88+** ✅
- **Safari 14+** ✅
- **Edge 90+** ✅

Requires WebGL 2.0 support.

## 🚀 Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory ready for deployment.

## 🐛 Troubleshooting

### Photos not loading?

- Check that photos are in `assets/photos/`
- Run `npm run generate-manifest`
- Verify supported file formats (JPG, PNG, WebP)

### Performance issues?

- Reduce photo file sizes (< 5MB recommended)
- Limit to 20-50 photos for optimal performance
- Lower shadow quality in settings

### WebGL errors?

- Update your graphics drivers
- Try a different browser
- Check WebGL support at [webglreport.com](https://webglreport.com)

## 🤝 Contributing

This project is designed to be easily customizable. Feel free to:

- Add new environment themes
- Implement additional photo effects
- Create new interaction modes
- Improve performance optimizations

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- **Three.js** - Amazing 3D library
- **Vite** - Fast build tool
- **WebGL** - Enabling beautiful 3D graphics in browsers

---

**Enjoy your immersive 3D photo gallery experience!** 📸✨

For questions or issues, please check the troubleshooting section above or review the code documentation.
