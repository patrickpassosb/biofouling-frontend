// Chart rendering for maintenance data
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for dashboard integration to load data
    setTimeout(() => {
        renderMaintenanceChart();
    }, 500);
    addInteractivity();
});

function renderMaintenanceChart(customData = null) {
    const canvas = document.getElementById('maintenanceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = 250;
    
    canvas.width = width;
    canvas.height = height;
    
    // Data for each month
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Use custom data if provided, otherwise use default
    let data = customData;
    if (!data || !Array.isArray(data) || data.length !== 12) {
        // Try to get data from dashboard integration
        if (typeof calculateMaintenanceData === 'function') {
            const monthlyData = calculateMaintenanceData();
            data = months.map((_, index) => {
                const monthKey = `${new Date().getFullYear()}-${String(index + 1).padStart(2, '0')}`;
                return monthlyData[monthKey] || 0;
            });
        } else {
            // Default fallback data
            data = [1, 2, 2, 3, 3, 2, 3, 1, 3, 4, 4, 4];
        }
    }
    
    const maxValue = Math.max(...data, 1); // Ensure at least 1 to avoid division by zero
    
    // Chart dimensions
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / months.length;
    const barPadding = barWidth * 0.3;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw bars
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * barWidth + barPadding / 2;
        const y = height - padding - barHeight;
        const actualBarWidth = barWidth - barPadding;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, y, 0, height - padding);
        gradient.addColorStop(0, '#1A932E');
        gradient.addColorStop(1, '#0d6b1f');
        
        // Draw bar with rounded top
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, actualBarWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();
        
        // Add hover effect data
        canvas.addEventListener('mousemove', function(e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            if (mouseX >= x && mouseX <= x + actualBarWidth && 
                mouseY >= y && mouseY <= height - padding) {
                canvas.style.cursor = 'pointer';
            }
        });
    });
    
    // Draw X-axis labels
    ctx.fillStyle = '#4D4D4D';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    months.forEach((month, index) => {
        const x = padding + index * barWidth + barWidth / 2;
        const y = height - padding + 20;
        ctx.fillText(month, x, y);
    });
    
    // Draw Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const y = height - padding - (i / 4) * chartHeight;
        ctx.fillText(i.toString(), padding - 10, y + 4);
    }
    
    // Draw grid lines
    ctx.strokeStyle = '#E9E9E9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = height - padding - (i / 4) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
}

// Polyfill for roundRect if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radii) {
        if (!Array.isArray(radii)) {
            radii = [radii, radii, radii, radii];
        }
        
        this.moveTo(x + radii[0], y);
        this.lineTo(x + width - radii[1], y);
        this.quadraticCurveTo(x + width, y, x + width, y + radii[1]);
        this.lineTo(x + width, y + height - radii[2]);
        this.quadraticCurveTo(x + width, y + height, x + width - radii[2], y + height);
        this.lineTo(x + radii[3], y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radii[3]);
        this.lineTo(x, y + radii[0]);
        this.quadraticCurveTo(x, y, x + radii[0], y);
        this.closePath();
    };
}

function addInteractivity() {
    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add animation on scroll for cards
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all cards
    document.querySelectorAll('.highlight-card, .info-card').forEach(card => {
        observer.observe(card);
    });
    
    // Animate progress bars
    setTimeout(() => {
        document.querySelectorAll('.progress-fill').forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0';
            setTimeout(() => {
                bar.style.transition = 'width 1s ease';
                bar.style.width = width;
            }, 100);
        });
    }, 500);
    
    // Add ripple effect to buttons
    document.querySelectorAll('.nav-item, .notification-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Resize chart on window resize
window.addEventListener('resize', () => {
    renderMaintenanceChart();
});

// Add ripple CSS dynamically
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
