
"use client"

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GraduationCap, BookOpen, MessageSquare, FileText, Laptop, Lightbulb } from 'lucide-react';

// Using path data for icons to draw on canvas
const ICONS = {
    GRADUATION_CAP: 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.084a1 1 0 0 0 0 1.838l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-6',
    BOOK_OPEN: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
    MESSAGE_SQUARE: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    FILE_TEXT: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4 M10 9H8 M16 13H8 M16 17H8',
    LAPTOP: 'M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16',
    LIGHTBULB: 'M15 14c.2-1 .7-1.7 1.5-2.5C17.7 10.2 18 9 18 7c0-2.2-1.8-4-4-4S9.8 4.1 9 6c-.8 2-2 2-2 4 0 2 .3 3.2 1.5 4.5C9.3 15.3 9.8 16 10 17h5z M12 20h.01'
};
const iconList = Object.values(ICONS);


const NetworkBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        
        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = Math.max(1, Math.floor(window.innerWidth));
            const height = Math.max(1, Math.floor(window.innerHeight));
            // Set the drawing buffer size taking DPR into account
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            // Use CSS to size the canvas to the viewport in CSS pixels
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            // Prevent the canvas from overflowing horizontally
            canvas.style.maxWidth = '100vw';
            canvas.style.display = 'block';
            // Reset transform and apply DPR scaling once to avoid cumulative scaling on repeated resizes
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
            color: string;
            iconPath: string | null;

            constructor(x: number, y: number, isIcon: boolean) {
                this.x = x;
                this.y = y;
                this.vx = Math.random() * 0.4 - 0.2;
                this.vy = Math.random() * 0.4 - 0.2;
                this.radius = isIcon ? 12 : Math.random() * 1.5 + 1;
                this.color = isIcon ? 'hsl(190 80% 60%)' : 'hsl(210 40% 98% / 0.5)';
                this.iconPath = isIcon ? iconList[Math.floor(Math.random() * iconList.length)] : null;
            }

            draw(context: CanvasRenderingContext2D) {
                if (this.iconPath) {
                    context.save();
                    context.translate(this.x, this.y);
                    context.scale(0.8, 0.8);
                    const path = new Path2D(this.iconPath);
                    context.strokeStyle = this.color;
                    context.lineWidth = 1.5;
                    context.stroke(path);
                    context.restore();
                } else {
                    context.beginPath();
                    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    context.fillStyle = this.color;
                    context.fill();
                }
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > window.innerWidth) this.vx *= -1;
                if (this.y < 0 || this.y > window.innerHeight) this.vy *= -1;
            }
        }

        const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 18000);
        const particles: Particle[] = [];
        for (let i = 0; i < particleCount; i++) {
             const isIcon = Math.random() < 0.1; // 10% chance to be an icon
            particles.push(new Particle(Math.random() * window.innerWidth, Math.random() * window.innerHeight, isIcon));
        }

        const handleMouseMove = (event: MouseEvent) => {
            mousePos.current.x = event.clientX;
            mousePos.current.y = event.clientY;
        };
        window.addEventListener('mousemove', handleMouseMove);

        const connectParticles = () => {
            const maxDist = 120;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i; j < particles.length; j++) {
                    const dist = Math.sqrt(
                        Math.pow(particles[i].x - particles[j].x, 2) + Math.pow(particles[i].y - particles[j].y, 2)
                    );

                    if (dist < maxDist) {
                        ctx.beginPath();
                        ctx.strokeStyle = `hsl(190 80% 60% / ${1 - dist / maxDist})`;
                        ctx.lineWidth = 0.3;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            particles.forEach(p => {
                p.update();
                p.draw(ctx);
            });
            connectParticles();
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 -z-10 block w-screen h-screen max-w-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />;
};

export default NetworkBackground;
