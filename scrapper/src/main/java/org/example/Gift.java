package org.example;

public class Gift {
    public String imageUrl;
    public String name;
    public String category;
    public String description;
    public String richDescription;

    public Gift() {}

    public Gift(String imageUrl, String name, String category, String description, String richDescription) {
        this.imageUrl = imageUrl;
        this.name = name;
        this.category = category;
        this.description = description;
        this.richDescription = richDescription;
    }

    @Override
    public String toString() {
        return "{"
                + "\"imageUrl\":\"" + escape(imageUrl) + "\","
                + "\"name\":\"" + escape(name) + "\","
                + "\"category\":\"" + escape(category) + "\","
                + "\"richDescription\":" + (richDescription == null ? "[]" : richDescription)
                + "}";
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }
}
