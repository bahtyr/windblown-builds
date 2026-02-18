package org.example;

public class Gift {
    String imageUrl;
    String name;
    String category;
    String description;
    String richDescription;

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
