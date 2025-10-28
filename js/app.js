// Estado global
let homeData = null;
let projectsData = {};
let activeLanguage = 'cat';
let activeAuthor = null;

// Elementos del DOM
const sidebar = document.getElementById('sidebar');
const projectMenu = document.getElementById('project-menu');
const projectsContainer = document.getElementById('projects-container');
const langButtons = document.querySelectorAll('.lang-btn');
const authorButtons = document.querySelectorAll('.author-btn');

// Inicializar la aplicación
async function init() {
    try {
        // Cargar home.json
        const homeResponse = await fetch('/data/home.json');
        homeData = await homeResponse.json();
        
        // Actualizar color de fondo del sidebar
        updateSidebarColor();
        
        // Cargar proyectos visibles
        const visibleProjects = getVisibleProjectsFromHome();
        await loadProjects(visibleProjects);
        
        // Renderizar interfaz
        renderProjectMenu();
        renderProjects();
        
        // Configurar event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
    }
}

// Obtener proyectos visibles del home.json
function getVisibleProjectsFromHome() {
    return homeData.projectes_visibles.filter(p => 
        p.visible === true || p.visible === 'si'
    );
}

// Cargar todos los proyectos
async function loadProjects(visibleProjects) {
    const promises = visibleProjects.map(async (project) => {
        const response = await fetch(`/data/${project.slug}.json`);
        const data = await response.json();
        projectsData[project.slug] = data;
    });
    
    await Promise.all(promises);
}

// Actualizar color de fondo del sidebar
function updateSidebarColor() {
    const color = homeData.home_colors[activeLanguage];
    document.body.style.backgroundColor = color;
}

// Renderizar menú de navegación
function renderProjectMenu() {
    const visibleProjects = getVisibleProjects();
    
    projectMenu.innerHTML = '';
    
    visibleProjects.forEach(project => {
        const projectData = projectsData[project.slug];
        if (!projectData) return;
        
        const button = document.createElement('button');
        button.className = 'project-link';
        button.textContent = projectData.titol[activeLanguage];
        button.onclick = () => scrollToProject(project.slug);
        
        projectMenu.appendChild(button);
    });
}

// Renderizar proyectos
function renderProjects() {
    const allProjects = getVisibleProjectsFromHome();
    const visibleProjects = getVisibleProjects();
    const visibleSlugs = visibleProjects.map(p => p.slug);
    
    // Crear wrapper si no existe
    let wrapper = projectsContainer.querySelector('.projects-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'projects-wrapper';
        projectsContainer.innerHTML = '';
        projectsContainer.appendChild(wrapper);
    }
    
    // Limpiar contenedor
    wrapper.innerHTML = '';
    
    // Renderizar todos los proyectos
    allProjects.forEach(project => {
        const projectData = projectsData[project.slug];
        if (!projectData) return;
        
        const section = document.createElement('section');
        section.className = 'project-section';
        section.id = `project-${project.slug}`;
        section.style.backgroundColor = project.color;
        
        // Ocultar si no está en la lista de visibles
        if (!visibleSlugs.includes(project.slug)) {
            section.classList.add('hidden');
        }
        
        const content = document.createElement('div');
        content.className = 'project-content';
        
        // Imagen principal
        const img = document.createElement('img');
        img.className = 'project-image';
        img.src = projectData.primera_imatge.src;
        img.alt = projectData.titol[activeLanguage];
        img.onerror = () => {
            img.src = '/images/reference/pasted_file_KN2lG4_MacBookAir-1.png';
        };
        
        // Información del proyecto
        const info = document.createElement('div');
        info.className = 'project-info';
        
        const title = document.createElement('h2');
        title.className = 'project-title';
        title.textContent = projectData.titol[activeLanguage];
        
        const details = document.createElement('div');
        details.className = 'project-details';
        
        const client = document.createElement('p');
        client.className = 'project-detail';
        client.textContent = projectData.client[activeLanguage];
        
        const lloc = document.createElement('p');
        lloc.className = 'project-detail';
        lloc.textContent = projectData.lloc[activeLanguage];
        
        const data = document.createElement('p');
        data.className = 'project-detail';
        data.textContent = projectData.data;
        
        const text = document.createElement('p');
        text.className = 'project-text';
        text.textContent = projectData.text[activeLanguage];
        
        details.appendChild(client);
        details.appendChild(lloc);
        details.appendChild(data);
        
        info.appendChild(title);
        info.appendChild(details);
        info.appendChild(text);
        
        content.appendChild(img);
        content.appendChild(info);
        section.appendChild(content);
        
        wrapper.appendChild(section);
    });
}

// Obtener proyectos visibles según filtros activos
function getVisibleProjects() {
    let visible = getVisibleProjectsFromHome();
    
    if (activeAuthor) {
        visible = visible.filter(p => p.autor === activeAuthor);
    }
    
    return visible;
}

// Scroll suave a un proyecto
function scrollToProject(slug) {
    const element = document.getElementById(`project-${slug}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Selector de idioma
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            
            // Actualizar botones activos
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Cambiar idioma
            activeLanguage = lang;
            updateSidebarColor();
            renderProjectMenu();
            updateProjectsContent();
        });
    });
    
    // Selector de autores
    authorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const author = btn.dataset.author;
            
            if (activeAuthor === author) {
                // Desactivar autor
                activeAuthor = null;
                btn.classList.remove('active');
            } else {
                // Activar nuevo autor
                authorButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeAuthor = author;
            }
            
            // Actualizar vista
            renderProjectMenu();
            updateProjectsVisibility();
        });
    });
}

// Actualizar contenido de proyectos (sin recrear el DOM completo)
function updateProjectsContent() {
    const allProjects = getVisibleProjectsFromHome();
    
    allProjects.forEach(project => {
        const projectData = projectsData[project.slug];
        if (!projectData) return;
        
        const section = document.getElementById(`project-${project.slug}`);
        if (!section) return;
        
        // Actualizar textos
        const title = section.querySelector('.project-title');
        const client = section.querySelectorAll('.project-detail')[0];
        const lloc = section.querySelectorAll('.project-detail')[1];
        const text = section.querySelector('.project-text');
        const img = section.querySelector('.project-image');
        
        if (title) title.textContent = projectData.titol[activeLanguage];
        if (client) client.textContent = projectData.client[activeLanguage];
        if (lloc) lloc.textContent = projectData.lloc[activeLanguage];
        if (text) text.textContent = projectData.text[activeLanguage];
        if (img) img.alt = projectData.titol[activeLanguage];
    });
}

// Actualizar visibilidad de proyectos
function updateProjectsVisibility() {
    const visibleProjects = getVisibleProjects();
    const visibleSlugs = visibleProjects.map(p => p.slug);
    
    const allSections = document.querySelectorAll('.project-section');
    allSections.forEach(section => {
        const slug = section.id.replace('project-', '');
        if (visibleSlugs.includes(slug)) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
