export const focusFirstInvalidControl = (selector = '[aria-invalid="true"]'): void => {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) {
    element.focus();
  }
};
