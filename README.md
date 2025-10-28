# Portfolio Dinámico

Sitio web de portfolio con filtros de idioma y autor, gestionado por archivos JSON.

## Estructura de archivos

```
portfolio-dinamico/
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos CSS
├── js/
│   └── app.js          # Lógica JavaScript
├── data/
│   ├── home.json       # Configuración de la home (colores, proyectos visibles)
│   └── [slug].json     # Archivo JSON por cada proyecto
└── images/
    └── reference/      # Imágenes de referencia
```

## Configuración

### home.json

Define los colores de la home según idioma y los proyectos visibles:

```json
{
    "home_colors": {
        "cat": "#F5E6D3",
        "es": "#E8D4C0"
    },
    "projectes_visibles": [
        {
            "slug": "nombre-proyecto",
            "color": "#B8D4E8",
            "visible": true,
            "autor": "miranda perez hita"
        }
    ]
}
```

### [slug].json

Cada proyecto tiene su propio archivo JSON con toda su información:

```json
{
    "slug": "nombre-proyecto",
    "folder": "nombre-proyecto",
    "primera_imatge": {
        "src": "/images/proyecto/cover.jpg",
        "size": "large"
    },
    "titol": {
        "cat": "Título en catalán",
        "es": "Título en español",
        "link": ""
    },
    "client": {
        "cat": "Cliente en catalán",
        "es": "Cliente en español",
        "link": ""
    },
    "lloc": {
        "cat": "Lugar en catalán",
        "es": "Lugar en español",
        "link": ""
    },
    "data": "2024",
    "text": {
        "cat": "Descripción en catalán",
        "es": "Descripción en español"
    },
    "imatges": []
}
```

## Funcionalidades

### Filtros

- **Idioma**: CAT (por defecto) / ES
  - Cambia el color de fondo del sidebar
  - Cambia el contenido de los proyectos
  - Cambia el menú de navegación

- **Autor**: miranda perez hita / equipa grafica / 6508
  - Por defecto ninguno activo (muestra todos)
  - Click activa/desactiva con negrita
  - Filtra proyectos según autor

### Navegación

- Menú inferior en el sidebar con anchor links
- Scroll suave a cada proyecto
- Se actualiza dinámicamente según filtros activos

## Responsive

- **Desktop (>1000px)**: Sidebar 1/3, Contenido 2/3
- **Tablet (600-1000px)**: Sidebar 1/4, Contenido 3/4
- **Mobile (<600px)**: Pendiente de implementar

## Cómo usar

1. Coloca tus imágenes en `/images/`
2. Crea un archivo JSON por cada proyecto en `/data/`
3. Actualiza `/data/home.json` con los proyectos visibles
4. Abre `index.html` en un navegador

## Servidor local

Para probar localmente con un servidor HTTP:

```bash
python3 -m http.server 8080
```

Luego abre: http://localhost:8080
