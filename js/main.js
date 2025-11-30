const toggle = document.getElementById("dashboardToggle");
const dropdown = document.getElementById("dashboardDropdown");

if (toggle && dropdown) {
  let isOpen = false;

  const setDropdown = (open) => {
    isOpen = open;
    dropdown.classList.toggle("opacity-0", !open);
    dropdown.classList.toggle("opacity-100", open);
    dropdown.classList.toggle("pointer-events-none", !open);
    dropdown.classList.toggle("pointer-events-auto", open);
    toggle.setAttribute("aria-expanded", String(open));
    dropdown.setAttribute("aria-hidden", String(!open));
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setDropdown(!isOpen);
  });

  document.addEventListener("click", (event) => {
    if (
      isOpen &&
      !dropdown.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      setDropdown(false);
    }
  });

  dropdown.addEventListener("click", (event) => {
    event.stopPropagation();
    setDropdown(false);
  });
}
