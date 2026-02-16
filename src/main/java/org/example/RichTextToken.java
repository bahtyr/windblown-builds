package org.example;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

public class RichTextToken {
    String key;
    String value;
    Map<String, String> attributes = new LinkedHashMap<>();
    boolean bold;

    RichTextToken(String key, String value) {
        this.key = key;
        this.value = value;
    }

    RichTextToken with(String key, String value) {
        if (value != null && !value.isBlank()) {
            attributes.put(key, value);
        }
        return this;
    }

    RichTextToken withBold(boolean bold) {
        this.bold = bold;
        return this;
    }

    String toJsonLikeString() {
        StringBuilder out = new StringBuilder("{\"key\":\"").append(escape(key)).append("\"");
        if (value != null) {
            out.append(",\"text\":\"").append(escape(value)).append("\"");
        }
        if (!attributes.isEmpty()) {
            out.append(",").append(attributes.entrySet().stream()
                    .map(e -> "\"" + escape(e.getKey()) + "\":\"" + escape(e.getValue()) + "\"")
                    .collect(Collectors.joining(",")));
        }
        if (bold) {
            out.append(",\"bold\":true");
        }
        out.append("}");
        return out.toString();
    }

    private String escape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }
}
