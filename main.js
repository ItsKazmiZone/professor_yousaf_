import emailjs from '@emailjs/browser';

// Cache for prefetched page contents
const prefetchCache = new Map();

// Immediate Theme Setup to prevent FOUC (Flash of Unstyled Content)
(function() {
  const storedTheme = localStorage.getItem('theme') || 'light';
  if (storedTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  initPJAX();
  initThemeSwitcher();
  initNavUnderline();
  initScrollAnimations();
  initMobileMenu();
  initFaqAccordions();
  initResourceFilter();
  initContactForm();
  initFooterYear();
  initWhatsAppButton();
});

/**
 * PJAX (PushState + AJAX) Transition and Prefetching Engine
 */
function initPJAX() {
  // Add loading bar styling if not already present
  let loadingBar = document.getElementById('pjax-loading-bar');
  if (!loadingBar) {
    loadingBar = document.createElement('div');
    loadingBar.id = 'pjax-loading-bar';
    loadingBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background-color: var(--gold-color, #c5a880);
      z-index: 10002;
      width: 0%;
      opacity: 0;
      transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
    `;
    document.body.appendChild(loadingBar);
  }

  // Handle back/forward navigation
  window.addEventListener('popstate', () => {
    loadPage(window.location.pathname, false);
  });

  // Intercept all internal page link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Filter out external, new tab, hash, and download links
    if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;
    if (link.getAttribute('target') === '_blank') return;
    if (href.startsWith('#')) return;
    if (link.hasAttribute('download')) return;

    e.preventDefault();
    const url = new URL(href, window.location.origin);
    loadPage(url.pathname, true);
  });

  // Prefetch pages on mouse hover or touch start for instant loads
  document.addEventListener('mouseover', handlePrefetch);
  document.addEventListener('touchstart', handlePrefetch, { passive: true });
}

function handlePrefetch(e) {
  const link = e.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href) return;

  if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;
  if (link.getAttribute('target') === '_blank') return;
  if (href.startsWith('#')) return;
  if (link.hasAttribute('download')) return;

  const url = new URL(href, window.location.origin);
  const pathname = url.pathname;

  // Do not prefetch the current page or already cached pages
  if (pathname === window.location.pathname) return;
  if (prefetchCache.has(pathname)) return;

  const prefetchPromise = fetch(pathname)
    .then(res => {
      if (!res.ok) throw new Error();
      return res.text();
    })
    .catch(() => null);

  prefetchCache.set(pathname, prefetchPromise);
}

function startLoading() {
  const loadingBar = document.getElementById('pjax-loading-bar');
  if (!loadingBar) return;
  loadingBar.style.width = '0%';
  loadingBar.style.opacity = '1';
  loadingBar.offsetHeight; // force layout reflow
  loadingBar.style.width = '70%';
}

function stopLoading() {
  const loadingBar = document.getElementById('pjax-loading-bar');
  if (!loadingBar) return;
  loadingBar.style.width = '100%';
  setTimeout(() => {
    loadingBar.style.opacity = '0';
    setTimeout(() => {
      loadingBar.style.width = '0%';
    }, 300);
  }, 200);
}

async function loadPage(pathname, pushState = true) {
  startLoading();

  let htmlText;
  if (prefetchCache.has(pathname)) {
    htmlText = await prefetchCache.get(pathname);
  }

  if (!htmlText) {
    try {
      const res = await fetch(pathname);
      if (!res.ok) throw new Error();
      htmlText = await res.text();
    } catch (err) {
      window.location.href = pathname;
      return;
    }
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    // Update Page Title
    document.title = doc.title;

    // Update Meta Tags (Description, Open Graph) for SEO/Social Sharing
    updateMetaTags(doc);

    const currentHeader = document.getElementById('mainHeader');
    const currentFooter = document.querySelector('footer');

    const newHeader = doc.getElementById('mainHeader');
    const newFooter = doc.querySelector('footer');

    if (!currentHeader || !currentFooter || !newHeader || !newFooter) {
      window.location.href = pathname;
      return;
    }

    // Extract all children between mainHeader and footer in the loaded page
    const newDocBody = doc.body;
    const elementsToInsert = [];
    let record = false;

    for (let i = 0; i < newDocBody.childNodes.length; i++) {
      const node = newDocBody.childNodes[i];
      if (node.nodeType === Node.ELEMENT_NODE && node.id === 'mainHeader') {
        record = true;
        continue;
      }
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'footer') {
        record = false;
        break;
      }
      if (record) {
        elementsToInsert.push(node);
      }
    }

    // Clean up current page specific content between header and footer
    let sibling = currentHeader.nextSibling;
    while (sibling && sibling !== currentFooter) {
      const next = sibling.nextSibling;
      sibling.remove();
      sibling = next;
    }

    // Insert new elements right before the footer
    elementsToInsert.forEach(node => {
      const importedNode = document.importNode(node, true);
      currentFooter.parentNode.insertBefore(importedNode, currentFooter);
    });

    if (pushState) {
      history.pushState(null, '', pathname);
    }

    // Update header/navigation active classes
    updateActiveLinks(pathname);

    // Re-initialize dynamic components/form handlers
    initThemeSwitcher();
    initNavUnderline();
    initScrollAnimations();
    initMobileMenu();
    initFaqAccordions();
    initResourceFilter();
    initContactForm();
    initFooterYear();

    // Instant smooth scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'instant' });

  } catch (err) {
    console.error('PJAX Transition Error:', err);
    window.location.href = pathname;
  } finally {
    stopLoading();
  }
}

function updateActiveLinks(pathname) {
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      const linkPath = new URL(href, window.location.origin).pathname;
      const isHomeMatch = (pathname === '/' || pathname === '/index.html') && (linkPath === '/' || linkPath === '/index.html');
      const isExactMatch = linkPath === pathname;
      if (isHomeMatch || isExactMatch) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    }
  });
}

/**
 * Mobile Navigation Menu Handler
 */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  if (!toggleBtn || !navMenu) return;

  // Create overlay element dynamically if it doesn't already exist
  let overlay = document.querySelector('.nav-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);
  }

  // Central toggle helper
  function toggleMenu(forceState) {
    const isCurrentlyOpen = navMenu.classList.contains('open');
    const shouldOpen = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;

    if (shouldOpen) {
      navMenu.classList.add('open');
      overlay.classList.add('active');
      document.body.classList.add('menu-open');
      toggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
    } else {
      navMenu.classList.remove('open');
      overlay.classList.remove('active');
      document.body.classList.remove('menu-open');
      toggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="12" x2="20" y2="12"></line>
          <line x1="4" y1="6" x2="20" y2="6"></line>
          <line x1="4" y1="18" x2="20" y2="18"></line>
        </svg>
      `;
    }
  }

  // Guard against duplicate event listeners on persistent header buttons
  if (toggleBtn.dataset.initialized === 'true') {
    // Just ensure the menu is closed on transition
    toggleMenu(false);
    return;
  }
  toggleBtn.dataset.initialized = 'true';

  toggleBtn.addEventListener('click', () => toggleMenu());
  overlay.addEventListener('click', () => toggleMenu(false));

  // Close mobile menu when clicking any nav link
  const navLinks = document.querySelectorAll('.nav-link, .nav-menu .btn');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      toggleMenu(false);
    });
  });
}

/**
 * FAQ Collapsible Accordions with Smooth Max-Height Transition
 */
function initFaqAccordions() {
  const faqHeaders = document.querySelectorAll('.faq-header');
  
  faqHeaders.forEach(header => {
    if (header.dataset.initialized === 'true') return;
    header.dataset.initialized = 'true';

    header.addEventListener('click', () => {
      const faqItem = header.parentElement;
      const faqContent = header.nextElementSibling;
      const isActive = faqItem.classList.contains('active');
      
      // Close all other FAQ items for a clean accordion effect
      const allItems = document.querySelectorAll('.faq-item');
      allItems.forEach(item => {
        item.classList.remove('active');
        const content = item.querySelector('.faq-content');
        if (content) content.style.maxHeight = null;
      });

      // Toggle current item
      if (!isActive) {
        faqItem.classList.add('active');
        // Set max-height to scrollHeight for smooth transition
        faqContent.style.maxHeight = faqContent.scrollHeight + "px";
      } else {
        faqItem.classList.remove('active');
        faqContent.style.maxHeight = null;
      }
    });
  });
}

/**
 * Live Client-Side Searching & Tag Filtering for resources.html
 */
function initResourceFilter() {
  const searchInput = document.querySelector('.search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const resourceCards = document.querySelectorAll('.resource-item');
  
  if (!resourceCards.length) return;

  let currentCategory = 'all';
  let searchQuery = '';

  // Update visible items based on current category and search query
  const applyFilter = () => {
    resourceCards.forEach(card => {
      const title = card.querySelector('h3').textContent.toLowerCase();
      const desc = card.querySelector('p').textContent.toLowerCase();
      const category = card.getAttribute('data-category');
      
      const matchesSearch = title.includes(searchQuery) || desc.includes(searchQuery);
      const matchesCategory = currentCategory === 'all' || category === currentCategory;

      if (matchesSearch && matchesCategory) {
        card.style.display = 'flex';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      } else {
        card.style.display = 'none';
        card.style.opacity = '0';
      }
    });
  };

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFilter();
    });
  }

  // Category filter button handler
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active class
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentCategory = btn.getAttribute('data-filter');
      applyFilter();
    });
  });
}

/**
 * Interactive Form Submission with EmailJS Integration and Fallback Mode
 */
function initContactForm() {
  const contactForm = document.getElementById('tuitionContactForm');
  const feedbackEl = document.getElementById('formFeedback');

  if (!contactForm) return;

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Clear feedback state
    feedbackEl.className = 'form-feedback';
    feedbackEl.textContent = '';
    feedbackEl.style.display = 'none';

    // Basic Validation
    const name = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const phone = document.getElementById('studentPhone').value.trim();
    const level = document.getElementById('studentLevel').value;
    const message = document.getElementById('studentMessage').value.trim();

    if (!name || !email || !phone || !level || !message) {
      showFeedback('Please fill out all required fields.', 'error');
      return;
    }

    if (!validateEmail(email)) {
      showFeedback('Please provide a valid email address.', 'error');
      return;
    }

    // Submit button loading animation
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin" style="width:18px;height:18px;margin-right:8px;display:inline-block;vertical-align:middle;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Sending inquiry...
    `;

    // Load environment credentials dynamically via Vite's environment variables
    const serviceID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    // Graceful Fallback if environment keys are not configured yet
    if (!serviceID || !templateID || !publicKey) {
      console.warn("EmailJS environment credentials (VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY) are missing. Simulating successful send.");
      
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        
        showFeedback(
          `Thank you, ${name}! Your inquiry for Cambridge ${level} Mathematics tuition has been received. (Demonstration Mode: Complete EmailJS keys inside Settings to activate live emails).`, 
          'success'
        );
        contactForm.reset();
      }, 1500);
      return;
    }

    // Exact template parameters defined in the user's template block
    const templateParams = {
      user_name: name,
      user_email: email,
      user_phone: phone,
      user_subject: level,
      message: message
    };

    // Trigger EmailJS dispatch
    emailjs.send(serviceID, templateID, templateParams, publicKey)
      .then((response) => {
        console.log('EmailJS Success:', response.status, response.text);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        showFeedback(`Thank you, ${name}! Your inquiry for Cambridge ${level} Mathematics tuition has been sent successfully. Prof. Yousaf will contact you within 24 hours.`, 'success');
        contactForm.reset();
      })
      .catch((error) => {
        console.error('EmailJS Error:', error);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        showFeedback(`Failed to send inquiry: ${error.text || 'Service error'}. Please try again or reach out directly on WhatsApp.`, 'error');
      });
  });

  function showFeedback(msg, type) {
    feedbackEl.textContent = msg;
    feedbackEl.className = `form-feedback ${type}`;
    feedbackEl.style.display = 'block';
    
    // Smooth scroll to the feedback section
    feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}

/**
 * Dynamic Copyright Year in Footer
 */
function initFooterYear() {
  const yearSpan = document.getElementById('currentYear');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

/**
 * Updates description and Open Graph tags during dynamic page loads (PJAX)
 */
function updateMetaTags(newDoc) {
  // Update description
  const oldDesc = document.querySelector('meta[name="description"]');
  const newDesc = newDoc.querySelector('meta[name="description"]');
  if (oldDesc && newDesc) {
    oldDesc.setAttribute('content', newDesc.getAttribute('content'));
  }

  // Update OG / Twitter properties
  const properties = [
    'og:title', 'og:description', 'og:url', 'og:image', 'og:type',
    'twitter:title', 'twitter:description', 'twitter:url', 'twitter:image', 'twitter:card'
  ];

  properties.forEach(prop => {
    let selector = `meta[property="${prop}"]`;
    if (prop.startsWith('twitter:')) {
      selector = `meta[name="${prop}"]`;
    }
    
    const oldTag = document.querySelector(selector);
    const newTag = newDoc.querySelector(selector);
    if (oldTag && newTag) {
      oldTag.setAttribute('content', newTag.getAttribute('content'));
    }
  });
}

/**
 * Initializes and mounts the Floating WhatsApp Button
 */
function initWhatsAppButton() {
  if (document.getElementById('whatsapp-floating-btn')) return;
  
  const btn = document.createElement('a');
  btn.id = 'whatsapp-floating-btn';
  btn.className = 'whatsapp-float';
  btn.href = 'https://wa.me/923198034441?text=Hello%20Sir,%20I%20would%20like%20to%20know%20more%20about%20your%20online%20Mathematics%20tuition.';
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
  btn.title = 'Contact on WhatsApp';
  btn.setAttribute('aria-label', 'Contact Prof. Muhammad Yousaf on WhatsApp');
  
  // WhatsApp brand icon SVG
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L32 503l139.7-36.6c32.6 17.7 69 27 106.5 27 122.4 0 222-99.6 222-222 0-59.3-23.2-115-65.3-157.1zM223.9 474c-33.1 0-65.6-8.9-94.1-25.7l-6.7-4-82.8 21.7 22.1-80.7-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
    </svg>
  `;
  
  document.body.appendChild(btn);
}

/**
 * Initializes and mounts the Theme Switcher in the Navigation Menu
 */
function initThemeSwitcher() {
  const navMenu = document.getElementById('navMenu');
  if (!navMenu) return;
  
  // Prevent duplicate mounts
  if (document.getElementById('themeToggleLi')) return;
  
  const toggleLi = document.createElement('li');
  toggleLi.id = 'themeToggleLi';
  toggleLi.className = 'theme-toggle-item';
  
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'themeToggleBtn';
  toggleBtn.className = 'theme-toggle-btn';
  toggleBtn.setAttribute('aria-label', 'Toggle light/dark theme');
  toggleBtn.setAttribute('title', 'Toggle between light and dark theme');
  
  const currentTheme = localStorage.getItem('theme') || 'light';
  updateToggleIcon(toggleBtn, currentTheme);
  
  toggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    
    localStorage.setItem('theme', newTheme);
    updateToggleIcon(toggleBtn, newTheme);
  });
  
  toggleLi.appendChild(toggleBtn);
  
  // Insert before the last item (the 'Inquire Now' CTA button)
  const inquireLi = navMenu.lastElementChild;
  if (inquireLi) {
    navMenu.insertBefore(toggleLi, inquireLi);
  } else {
    navMenu.appendChild(toggleLi);
  }
}

/**
 * Updates the theme toggle button's inner HTML (icons + label) based on current theme
 */
function updateToggleIcon(btn, theme) {
  if (theme === 'dark') {
    // Sun icon for switching back to light mode
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <span class="theme-toggle-text">Light Mode</span>
    `;
  } else {
    // Moon icon for switching to dark mode
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <span class="theme-toggle-text">Dark Mode</span>
    `;
  }
}

/**
 * Intersection Observer-based loading animation for images and content sections
 */
function initScrollAnimations() {
  // Add 'js-enabled' class to document element to active CSS scroll-driven animations
  document.documentElement.classList.add('js-enabled');

  // Find all elements to animate
  const sections = document.querySelectorAll('section, .page-hero');
  const cards = document.querySelectorAll('.card, .testimonial-card, .resource-card, .timeline-card, .faq-item');
  const images = document.querySelectorAll('img');

  // Setup sections and page heroes
  sections.forEach(section => {
    if (section.id === 'hero' || section.classList.contains('hero-section') || section.classList.contains('page-hero')) {
      section.classList.add('animate-fade-in');
    } else {
      section.classList.add('animate-on-scroll');
    }
  });

  // Setup cards and other interactive grid/timeline/faq items
  cards.forEach(card => {
    card.classList.add('animate-on-scroll');
  });

  // Setup images for smooth fade-in and lazy shimmer wrapping
  images.forEach(img => {
    img.classList.add('animate-fade-in');
    
    // Wrap image with a lazy-shimmer container if not already loaded and not yet wrapped
    if (!img.complete && img.parentNode && !img.parentNode.classList.contains('lazy-image-container')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'lazy-image-container';
      
      // Copy existing classnames of the image if needed for layout preservation, but keep simple
      if (img.classList.contains('hero-portrait')) {
        wrapper.style.borderRadius = 'var(--border-radius-lg, 16px)';
      }
      
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
      
      const onImageLoad = () => {
        wrapper.classList.remove('lazy-image-container');
        img.classList.add('is-visible');
        img.removeEventListener('load', onImageLoad);
      };
      img.addEventListener('load', onImageLoad);
    } else {
      img.classList.add('is-visible');
    }
  });

  const markAsVisible = (element, delay = 1200) => {
    element.classList.add('is-visible');
    setTimeout(() => {
      element.classList.remove('animate-on-scroll', 'animate-fade-in', 'is-visible');
    }, delay);
  };

  // Setup Intersection Observer for scrolling animations
  const observerOptions = {
    root: null, // Viewport
    rootMargin: '0px 0px -50px 0px', // Trigger slightly before entering fully
    threshold: 0.05 // Trigger as soon as 5% of the element is visible
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        markAsVisible(entry.target, 1200);
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Select all animation targets
  const animTargets = document.querySelectorAll('.animate-on-scroll, .animate-fade-in');

  // Trigger immediate visibility for elements already in the viewport (above-the-fold)
  const viewportHeight = window.innerHeight;
  animTargets.forEach(target => {
    const rect = target.getBoundingClientRect();
    if (rect.top < viewportHeight && rect.bottom > 0) {
      // Elements above fold are already visible, remove classes faster
      markAsVisible(target, 100);
    } else {
      observer.observe(target);
    }
  });
}

/**
 * Sliding Underline Navigation Indicator
 */
function initNavUnderline() {
  const navMenu = document.querySelector('.nav-menu');
  if (!navMenu) return;

  // Let's create or select the indicator
  let indicator = navMenu.querySelector('.nav-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'nav-indicator';
    navMenu.appendChild(indicator);
  }

  const links = navMenu.querySelectorAll('.nav-link');
  
  function updateIndicator(targetElement) {
    if (!targetElement) {
      indicator.style.opacity = '0';
      return;
    }
    
    // Calculate position relative to navMenu
    const menuRect = navMenu.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    
    const left = targetRect.left - menuRect.left;
    const width = targetRect.width;
    
    indicator.style.transform = `translateX(${left}px)`;
    indicator.style.width = `${width}px`;
    indicator.style.opacity = '1';
  }

  // Get current active link
  let activeLink = navMenu.querySelector('.nav-link.active');
  
  // Set position with multiple attempts to avoid race conditions with rendering
  updateIndicator(activeLink);
  requestAnimationFrame(() => {
    activeLink = navMenu.querySelector('.nav-link.active');
    updateIndicator(activeLink);
  });
  setTimeout(() => {
    activeLink = navMenu.querySelector('.nav-link.active');
    updateIndicator(activeLink);
  }, 100);

  // Setup event listeners only once if not already done
  if (!navMenu.dataset.underlineListenersInit) {
    navMenu.dataset.underlineListenersInit = 'true';

    // Hover events
    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        updateIndicator(link);
      });
      
      link.addEventListener('mouseleave', () => {
        // Return to active link
        const currentActive = navMenu.querySelector('.nav-link.active');
        updateIndicator(currentActive);
      });
    });

    // Handle window resizing
    window.addEventListener('resize', () => {
      const currentActive = navMenu.querySelector('.nav-link.active');
      updateIndicator(currentActive);
    });
  }
}
