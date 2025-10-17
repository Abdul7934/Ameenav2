import React, { useEffect, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import LoadingSpinner from './LoadingSpinner';
import Alert from './Alert';

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const configureMermaid = useCallback(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    mermaid.initialize({
      startOnLoad: false,
      theme: isDarkMode ? 'dark' : 'default',
      securityLevel: 'loose',
      themeVariables: {
        background: isDarkMode ? '#1E293B' : '#FFFFFF', // slate-800 or white
        primaryColor: isDarkMode ? '#1E293B' : '#F0F9FF', // slate-800 or blue-50
        primaryTextColor: isDarkMode ? '#F1F5F9' : '#0F172A', // slate-100 or slate-900
        lineColor: isDarkMode ? '#60A5FA' : '#3B82F6', // blue-400 or blue-500
        textColor: isDarkMode ? '#F1F5F9' : '#0F172A',
      }
    });
  }, []);

  const renderDiagram = useCallback(async () => {
    if (!chart) {
        setIsLoading(false); setError(null); setSvg(null); return;
    }
    
    setIsLoading(true); setError(null);
    configureMermaid();

    try {
      // Validate syntax before rendering
      await mermaid.parse(chart);
      const { svg: renderedSvg } = await mermaid.render(`mermaid-diagram-${Date.now()}`, chart);
      setSvg(renderedSvg);
    } catch (e: any) {
      console.error("Mermaid rendering error:", e);
      const message = e.message || "Failed to render diagram. The AI might have generated invalid syntax.";
      setError(message.includes("Max character length exceeded") ? "Diagram is too large to render." : message);
      setSvg(null);
    } finally {
      setIsLoading(false);
    }
  }, [chart, configureMermaid]);
  
  useEffect(() => {
    renderDiagram();

    // Re-render when theme changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                renderDiagram();
            }
        });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, [chart, renderDiagram]);

  if (isLoading) {
    return <LoadingSpinner text="Rendering diagram..." />;
  }

  if (error) {
    return <Alert type="error" title="Diagram Error" message={error} />;
  }

  if (svg) {
    // The wrapper div is necessary to apply styles to the SVG content
    return <div className="mermaid-container" dangerouslySetInnerHTML={{ __html: svg }} />;
  }

  return null;
};

export default MermaidDiagram;
