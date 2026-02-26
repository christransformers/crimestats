ckan.module("ap-main", function ($, _) {
    "use strict";

    return {
        options: {},

        initialize: function () {
            document.querySelector("body").setAttribute("admin-panel-active", true);

            // register plugin helpers inside Sandbox object, available as `this.sandbox`
            // inside every module instance.
            ckan.sandbox.extend({
                "ap": {
                    /**
                     * Transform `{hello_world_prop: 1}` into `{hello:{world:{prop: 1}}}`
                     */
                    nestedOptions(options) {
                        const nested = {};

                        for (let name in options) {
                            if (typeof name !== "string") continue;

                            const path = name.split("_");
                            const prop = path.pop();
                            const target = path.reduce((container, part) => {
                                container[part] = container[part] || {};
                                return container[part];
                            }, nested);
                            target[prop] = options[name];
                        }

                        return nested;
                    },
                },
            });
        }
    };
});

ckan.module("ap-htmx", function ($) {
    return {
        initialize: function () {
            $.proxyAll(this, /_on/);

            // initialize CKAN modules for HTMX loaded pages
            htmx.on("htmx:afterSettle", function (event) {
                var elements = event.target.querySelectorAll("[data-module]");

                for (let node of elements) {
                    if (node.getAttribute("dm-initialized")) {
                        continue;
                    }

                    ckan.module.initializeElement(node);
                    node.setAttribute("dm-initialized", true)
                }
            });
        },
    };
});

/**
 * Theme switcher module
 *
 * This module is responsible for switching between light and dark themes.
 *
 * The module uses the localStorage to store the user's preferred theme.
 */
ckan.module("ap-theme-switcher", function ($, _) {
    "use strict";
    return {
        options: {},

        initialize: function () {
            this.light = "light";
            this.dark = "dark";

            this.defaultSchema = this.light;
            this.localStorageKey = "apPreferredColorScheme";

            this.scheme = this.getSchemeFromLS();

            this.el.on("click", this._onSwitch.bind(this));
            this.applyScheme();
        },

        getSchemeFromLS: function () {
            let currentSchema = window.localStorage.getItem(this.localStorageKey);
            return currentSchema ? currentSchema : this.defaultSchema
        },

        saveSchemeToLS: function () {
            window.localStorage.setItem(this.localStorageKey, this.scheme)
        },

        applyScheme: function () {
            document.querySelector("body").setAttribute("admin-panel-theme", this.scheme);
            document.querySelector("#admin-panel").setAttribute("admin-panel-theme", this.scheme);
        },

        _onSwitch: function () {
            this.scheme = this.scheme == this.light ? this.dark : this.light;
            this.applyScheme();
            this.saveSchemeToLS();
        }
    };
});

// NAVBAR NESTED DROPDOWN
// adjust mobile logic, to allow tapping on the nested dropdown level 1
ckan.module("ap-nested-dropdown", function ($, _) {
    "use strict";

    return {
        options: {},

        initialize: function () {
            this.apID = "#admin-panel";
            let self = this;

            $(`${self.apID} .dropdown-item.with-subitems`).click(function (e) {
                if (!self.isMobileDevice()) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                $(this).siblings().toggleClass("show");
            });

            $(`${self.apID} .nav-link.ap-dropdown-toggle`).click(function (e) {
                if (!self.isMobileDevice()) {
                    return;
                }

                $(`${self.apID} .submenu.dropdown-menu`).removeClass("show");
            })
        },
        isMobileDevice: function () {
            return window.innerWidth <= 992;
        }
    };
});

ckan.module("ap-toggle-state", function ($) {
    /**
     * Disable/enable module host when `control` changes.
     */
    return {
        options: {
            control: null,
            event: "change",
            property: "checked",
        },

        initialize() {
            $.proxyAll(this, /_on/);

            this.control = $(this.options.control).on(
                this.options.event,
                this._onChange
            );
        },

        _onChange(event) {
            this.el.prop(
                "disabled",
                !this.control.prop(this.options.property)
            );
        },
    };
});

/**
 * Extends core confirm-action.js to append a submit button to a form on submit
 *
 * @param {Event} e
 */

var extendedModule = $.extend({}, ckan.module.registry["confirm-action"].prototype);

extendedModule._onConfirmSuccess = function (e) {
    if (this.el.attr("type") === "submit") {
        this.el.hide();
        this.el.closest("form").append(
            $('<input>').attr({
                type: 'hidden',
                id: this.el.attr("id"),
                name: this.el.attr("name"),
                value: this.el.val()
            })
        )
    }

    this.performAction();
}

ckan.module("ap-confirm-action", function ($, _) {
    "use strict";

    return extendedModule;
});

ckan.module("ap-bulk-check", function ($) {
    return {
        options: {
            selector: ".checkbox-cell-row input",
        },

        initialize() {
            $.proxyAll(this, /_on/);

            $(this.el).click(this._onClick)

            document.addEventListener('htmx:afterRequest', this._onAfterRequest);
        },

        _onClick(e) {
            $(this.options.selector).prop("checked", $(e.target).prop("checked"));
        },

        /**
         * Reinit bulk check script after HTMX request
         *
         * @param {Event} evt
         */
        _onAfterRequest: function (evt) {
            $('[data-module*="ap-bulk-check"]').each((_, el) => {
                $(el).click(this._onClick);
            })
        }
    };
});

ckan.module("ap-tooltip", function ($, _) {
    return {
        options: {
            customClass: 'ap-tooltip',
            placement: "bottom",
            html: true
        },
        initialize: function () {
            new bootstrap.Tooltip(this.el, this.options)

            document.addEventListener('htmx:afterRequest', this._onAfterRequest)
        },

        /**
         * Reinit tooltips after HTMX request to init dinamically created elements
         * tooltips
         *
         * @param {Event} evt
         */
        _onAfterRequest: function (evt) {
            $('[data-module*="ap-tooltip"]').each((_, el) => {
                new bootstrap.Tooltip(el, this.options)
            })
        }
    };
});

/**
 * Provides a way to trigger an AJAX notification
 */
ckan.module("ap-notify", function ($) {
    return {
        initialize: function () {
            $.proxyAll(this, /_on/);

            this.sandbox.subscribe("ap:notify", this._onShowNotification);

            $(".flash-messages .ap-notification").each((_, el) => {
                this._onShowNotification(el.dataset.message, el.dataset.category);
                el.remove();
            })
        },

        _onShowNotification: function (msg, msgType) {
            var tickIcon = document.createElement("i");

            if (msgType === "alert-danger") {
                msgType = "error"
            }

            tickIcon.classList = msgType === "error" ? ["fa fa-times"] : ["fa fa-check"];

            var toastDiv = document.createElement("div");

            toastDiv.id = "ap-notification-toast";
            toastDiv.style.display = "none";
            toastDiv.innerHTML = msg;
            toastDiv.classList = [msgType]
            toastDiv.prepend(tickIcon);

            document.querySelector(".main").appendChild(toastDiv);

            // Animate it and remove after
            $(toastDiv).slideDown(600);

            setTimeout(function () {
                $(toastDiv).slideUp(600, function () {
                    $(this).remove();
                });
            }, 5000);
        }
    };
});

/**
 * Disable current field on a form init based on target field value.
 *
 * For now, we are disabling it's only in UI. A person still could
 * remove a disable attribute via dev tools and send a value to a server.
 *
 * This is something we should fix later, but it's not a priority right now
 * because malicious use of the portal is not something we expect from sysadmins.
 */
ckan.module("ap-disable-field", function ($) {
    return {
        options: {
            targetFieldId: null,
            value: null,
        },

        initialize() {
            $.proxyAll(this, /_on/);

            const targetField = $(`#${this.options.targetFieldId}`);

            if (targetField.val() == this.options.value) {
                this.el.prop("disabled", 1);
            }
        }
    };
});

ckan.module("ap-copy-to-clipboard", function ($, _) {
    "use strict";

    return {
        options: {
            content: null,
            targetElement: null,
        },

        initialize: function () {
            $.proxyAll(this, /_on/);

            this.el.click(this._onClick)
        },

        /**
         * Get a text for copy. Could work with provided content or fetch it
         * from a target element.
         *
         * @returns {string|null}
         */
        _getTextToCopy: function () {
            if (!this.options.targetElement) {
                return this.options.content
            }

            let targetEl = $(this.options.targetElement);

            if (!targetEl) {
                return;
            }

            return targetEl.text().trim();
        },

        _onClick: function (e) {
            e.preventDefault();

            const text = this._getTextToCopy();

            if (!text) {
                return;
            }

            // Create a temporary input element
            var tempEl = document.createElement('textarea');
            tempEl.value = text;

            // Append the temp input element to the document
            document.body.appendChild(tempEl);

            // Select the text in the input element
            tempEl.select();
            tempEl.setSelectionRange(0, 99999);

            // Copy the selected text to the clipboard
            document.execCommand('copy');

            // Remove the temporary input element
            document.body.removeChild(tempEl);

            this.sandbox.publish("ap:notify", this._("The text is copied to the clipboard"));
        }
    };
});

ckan.module("ap-tom-select", function ($) {
    return {
        options: {
            valueField: "value",
            labelField: "text",
            plugins: {
                remove_button: {
                    title: 'Remove this item',
                },
                dropdown_input: {},
                clear_button: {
                    title: 'Remove all selected options',
                }
            },
            loadUrl: null,
            create: true,
            delimiter: ",",
        },

        initialize() {
            $.proxyAll(this, /_/);

            if (typeof TomSelect === "undefined") {
                console.error("[bulk-tom-select] TomSelect library is not loaded");
                return
            }

            if (this.options.loadUrl) {
                this.options.load = this._loadOptions;
            }

            const options = this.sandbox["ap"].nestedOptions(this.options);

            if (this.el.get(0, {}).tomselect) {
                return;
            }

            this.widget = new TomSelect(this.el, options);
        },

        _loadOptions: function (query, callback) {
            var self = this;

            if (self.loading > 1) {
                callback();
                return;
            }

            fetch(this.options.loadUrl)
                .then(response => response.json())
                .then(json => {
                    callback(json.result);
                    self.settings.load = null;
                }).catch(() => {
                    callback();
                });

        },
    };
});
