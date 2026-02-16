package org.example;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

public class RichTextToken {
    String t;
    String v;
    Map<String, String> attributes = new LinkedHashMap<>();

    RichTextToken(String t, String v) {
        this.t = t;
        this.v = v;
    }

    RichTextToken with(String key, String value) {
        if (value != null && !value.isBlank()) {
            attributes.put(key, value);
        }
        return this;
    }

    String toJsonLikeString() {
        StringBuilder out = new StringBuilder("{\"t\":\"").append(escape(t)).append("\"");
        if (v != null) {
            out.append(",\"v\":\"").append(escape(v)).append("\"");
        }
        if (!attributes.isEmpty()) {
            out.append(",").append(attributes.entrySet().stream()
                    .map(e -> "\"" + escape(e.getKey()) + "\":\"" + escape(e.getValue()) + "\"")
                    .collect(Collectors.joining(",")));
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
