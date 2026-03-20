# Textures Directory

This directory contains texture files for the 3D gallery environment.

## Required Texture Files

To use actual texture files instead of procedural textures, place the following files in this directory:

### Marble Table

- `marble_diffuse.jpg` - Main marble texture with veining
- `marble_normal.jpg` - Normal map for surface detail
- `marble_roughness.jpg` - Roughness map for material properties

### Gallery Room

- `wall_diffuse.jpg` - Clean white wall texture
- `wall_normal.jpg` - Subtle wall surface normal map
- `concrete_diffuse.jpg` - Polished concrete floor texture
- `concrete_normal.jpg` - Concrete surface normal map
- `concrete_roughness.jpg` - Concrete roughness map

## Fallback System

If texture files are not found, the system will automatically generate procedural textures using HTML5 Canvas. This ensures the gallery works even without texture files.

## Recommended Texture Properties

- **Resolution**: 1024x1024 or 2048x2048 pixels
- **Format**: JPG for diffuse maps, PNG for normal/roughness maps
- **Tiling**: Textures should be seamlessly tileable
- **Quality**: High-resolution for realistic appearance

## Sources for Free Textures

- [Poly Haven](https://polyhaven.com/textures) - CC0 PBR textures
- [Freepbr.com](https://freepbr.com/) - Free PBR materials
- [3D Textures](https://3dtextures.me/) - Free seamless textures
- [Texture Haven](https://texturehaven.com/) - High-quality textures
