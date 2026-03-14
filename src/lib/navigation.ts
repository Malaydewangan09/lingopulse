type RouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

type NavMode = 'push' | 'replace';

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    finished: Promise<void>;
  };
};

export function navigateWithTransition(router: RouterLike, href: string, mode: NavMode = 'push') {
  const run = () => {
    if (mode === 'replace') router.replace(href);
    else router.push(href);
  };

  if (typeof document === 'undefined') {
    run();
    return;
  }

  document.body.classList.add('route-transitioning');

  const cleanup = () => {
    window.setTimeout(() => {
      document.body.classList.remove('route-transitioning');
    }, 260);
  };

  const nextDocument = document as ViewTransitionDocument;
  if (typeof nextDocument.startViewTransition === 'function') {
    const transition = nextDocument.startViewTransition(() => {
      run();
    });
    transition.finished.finally(cleanup);
    return;
  }

  run();
  cleanup();
}
