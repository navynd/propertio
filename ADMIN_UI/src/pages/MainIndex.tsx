import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/SidebarLayout/Sidebar";
function MainIndex() {
  const [isNotificationHidden, setIsNotificationHidden] = useState(false);
  const [isToggleVisible, setIsToggleVisible] = useState(false);
  useEffect(() => {
    const checkNotificationVisibility = () => {
      const notificationDiv = document.querySelector('.verifynoti_div');
      if (notificationDiv) {
        const isHidden = notificationDiv.classList.contains('hidden');
        setIsNotificationHidden(isHidden);
      }
    };

    // Check initially
    checkNotificationVisibility();

    // Set up a MutationObserver to watch for class changes
    const observer = new MutationObserver(checkNotificationVisibility);
    const notificationDiv = document.querySelector('.verifynoti_div');

    if (notificationDiv) {
      observer.observe(notificationDiv, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const checkToggleVisibility = () => {
      const headertoogle_div = document.querySelector('.headertoogle_div');
      if (headertoogle_div) {
        // Check if the element is actually visible by checking computed style
        // The toggle has max-sm:flex lg:hidden, so it's visible on mobile
        const computedStyle = window.getComputedStyle(headertoogle_div);
        const isVisible = computedStyle.display !== 'none';
        setIsToggleVisible(isVisible);
      }
    };

    // Initial check after DOM is ready
    const timeoutId = setTimeout(() => {
      checkToggleVisibility();
    }, 100);

    // Check on window resize (responsive classes change based on screen size)
    window.addEventListener('resize', checkToggleVisibility);

    // Set up a MutationObserver to watch for class changes
    const observer = new MutationObserver(checkToggleVisibility);
    const headertoogle_div = document.querySelector('.headertoogle_div');

    if (headertoogle_div) {
      observer.observe(headertoogle_div, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('resize', checkToggleVisibility);
    };
  }, []);

  return (
    <>
      <div className="flex min-h-screen bg-[#FFF] lg:mt-0 mt-[70px]">
        <Sidebar />
        <div className="flex w-full flex-col lg:pl-[270px] xl:pl-[310px]">
          <main className={`bg-[#FFF] ${isNotificationHidden ? 'pt-[66px]' : ''} ${isToggleVisible ? 'pt-[120px]' : ''}`}>
            <div className="">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

    </>

  );
}

export default MainIndex;