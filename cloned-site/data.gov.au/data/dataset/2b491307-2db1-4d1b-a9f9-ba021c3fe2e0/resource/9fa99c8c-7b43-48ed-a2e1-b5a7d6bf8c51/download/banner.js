(() => {
  const enabled = 'ENABLED';

  // Requests the specified Artcle page and extracts the content.
  async function extractArticleContent(relativePath) {
    try {
      const response = await fetch(`${window.location.origin}${relativePath}`);
      const text = await response.text();
      const page = new DOMParser().parseFromString(text, 'text/html');
      const content = page.getElementsByTagName('article')[0].lastElementChild.firstElementChild;
      if (content.firstElementChild.innerHTML !== enabled) return Promise.resolve('');
      return Promise.resolve(content.lastElementChild.outerHTML);
    } catch (error) {
      Promise.reject(error);
    }
  }

  //Builds the banner and inserts it after the header element.
  function injectBanner(message) {
    const banner = document.createElement('div');
    const header = document.body.getElementsByTagName('header')[0];
    header.after(banner);
    banner.outerHTML = message
  }

  async function load() {
    try {
      const content = await extractArticleContent('/banner');
      if (content !== '') injectBanner(content);
    } catch (error) {
      console.error(`Banner failed to display due to ${error}`);
    }
  }

  load();
})();