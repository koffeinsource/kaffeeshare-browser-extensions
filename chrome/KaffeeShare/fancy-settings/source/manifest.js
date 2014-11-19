// Actual extensions settings
this.manifest = {
    "name": "KaffeeShare",
    "icon": "../../comic_30x30.png",
    "settings": [
        {
            "tab": i18n.get("sharing"),
            "group": i18n.get("backend"),
            "name": "server",
            "type": "text",
            "label": i18n.get("server_label"),
            "text": ""
        },
        {
            "tab": i18n.get("sharing"),
            "group": i18n.get("backend"),
            "name": "sever_description",
            "type": "description",
            "text": i18n.get("server_text")
        },
        {
            "tab": i18n.get("sharing"),
            "group": i18n.get("backend"),
            "name": "namespace",
            "type": "text",
            "label": i18n.get("namespace_label"),
            "text": ""
        },
        {
            "tab": i18n.get("sharing"),
            "group": i18n.get("backend"),
            "name": "namespace_description1",
            "type": "description",
            "text": i18n.get("namespace_text")
        },
        {
            "tab": i18n.get("sharing"),
            "group": i18n.get("backend"),
            "name": "https_disabled",
            "type": "checkbox",
            "label": i18n.get("https_label")
        },
        {
            "tab": i18n.get("sharing"),
            "group": i18n.get("backend"),
            "name": "check_for_news",
            "type": "checkbox",
            "label": i18n.get("news_label")
        },
        {
            "tab": i18n.get("sharing"),
            "group": i18n.get("backend"),
            "name": "double_click_for_share",
            "type": "checkbox",
            "label": i18n.get("double_click_label")
        },
        {
            "tab": i18n.get("sharing"),
            "group": i18n.get("like"),
            "name": "disconnect_description",
            "type": "description",
            "text": i18n.get("disconnect_text")
        },
    ],
    "alignment": [
        [
            "server", "namespace"
        ]
    ]
};
