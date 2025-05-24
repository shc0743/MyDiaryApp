
queueMicrotask(() => {
    const widgets_container = document.createElement('div');
    widgets_container.dataset.usage = '__CreateDynamicResizableView__';
    const CSS = new CSSStyleSheet();
    const css_Text = `
    widget-caption {
        display: flex;
        flex-direction: row;
    }
    widget-caption > span {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 0.5em;
    }
    [data-usage="__CreateDynamicResizableView__"] {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        inset: 0;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 0;
    }
    `;
    CSS.replace(css_Text).then(() => { document.adoptedStyleSheets.push(CSS) }).catch(() => {
        const style = document.createElement('style');
        style.innerHTML = css_Text;
        widgets_container.append(style);
    });
    globalThis.CreateDynamicResizableView = function (element, title, width, height) {
        const el = document.createElement('resizable-widget');
        el.style.width = Math.min(window.innerWidth, width) + 'px';
        el.style.height = Math.min(window.innerHeight, height) + 'px';
        widgets_container.append(el);

        const caption = document.createElement('widget-caption');
        caption.slot = 'widget-caption';
        const title_container = document.createElement('span');
        title_container.textContent = title;
        caption.append(title_container);
        const close_button = document.createElement('button');
        close_button.innerText = 'x';
        close_button.style.float = 'right';
        close_button.dataset.excludeBindmove = 'true';
        close_button.addEventListener('click', () => el.remove());
        caption.append(close_button);

        el.append(caption, element);
        el.open = true;

        return el;
    };

    document.body.append(widgets_container);
});
