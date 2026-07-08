import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HopLogTable from './HopLogTable';
import DashboardCards from './DashboardCards';

gsap.registerPlugin(ScrollTrigger);

/**
 * SummaryReport — Container for the full transmission analytics section.
 * Rendered below the canvas viewport. Uses GSAP ScrollTrigger for
 * staggered fade-in animations as user scrolls down.
 */
export default function SummaryReport({ packetResult }) {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const tableRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    if (!packetResult || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(headerRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 90%' }
        }
      );

      // Table animation
      gsap.fromTo(tableRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: tableRef.current, start: 'top 92%' }
        }
      );

      // Dashboard cards animation
      gsap.fromTo(cardsRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, delay: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: cardsRef.current, start: 'top 92%' }
        }
      );
    }, sectionRef);

    // Refresh ScrollTrigger after DOM updates
    const timer = setTimeout(() => ScrollTrigger.refresh(), 150);

    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [packetResult]);

  if (!packetResult) return null;

  return (
    <>
      {/* Scroll hint */}
      <div className="scroll-hint">▼ SCROLL FOR TRANSMISSION ANALYTICS ▼</div>

      <section className="summary-report-section" ref={sectionRef}>
        <div className="report-inner">
          <div className="report-header" ref={headerRef}>
            <h2>Transmission Analytics</h2>
            <p>Complete hop-by-hop breakdown with encoding translations and latency analysis</p>
          </div>

          <div ref={tableRef}>
            <HopLogTable packetResult={packetResult} />
          </div>

          <div ref={cardsRef}>
            <DashboardCards packetResult={packetResult} />
          </div>
        </div>
      </section>
    </>
  );
}
