/**
 * Smooth scroll navigation composable
 * Provides smooth scrolling to sections with header offset
 */
export const useSmoothScroll = () => {
  /**
   * Scroll to a specific section with smooth animation
   * @param sectionId - The ID of the target section (without #)
   * @param offset - Additional offset from top (default: 80px for header)
   */
  const scrollToSection = (sectionId: string, offset: number = 80) => {
    if (import.meta.client) {
      const element = document.getElementById(sectionId);
      if (element) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }
  };

  /**
   * Handle click event for smooth scroll
   * Prevents default behavior and scrolls to section
   * @param event - Click event
   * @param sectionId - The ID of the target section
   */
  const handleSmoothScroll = (event: Event, sectionId: string) => {
    event.preventDefault();
    scrollToSection(sectionId);
  };

  return {
    scrollToSection,
    handleSmoothScroll,
  };
};
