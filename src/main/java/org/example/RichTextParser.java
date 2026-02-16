package org.example;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.openqa.selenium.WebElement;

import java.util.ArrayList;
import java.util.List;

public class RichTextParser {

    static List<RichTextToken> parse(WebElement rowDescription) {
        String html = rowDescription.getAttribute("innerHTML");
        Document document = Jsoup.parseBodyFragment(html);

        List<RichTextToken> tokens = new ArrayList<>();
        for (Node node : document.body().childNodes()) {
            parseNode(node, tokens, false);
        }
        mergeNeighborTextTokens(tokens);
        return tokens;
    }

    private static void parseNode(Node node, List<RichTextToken> tokens, boolean boldContext) {
        if (node instanceof TextNode textNode) {
            String text = normalizeWhitespace(textNode.getWholeText());
            if (!text.isBlank()) {
                if (boldContext) {
                    tokens.add(new RichTextToken("bold", text));
                } else {
                    tokens.add(new RichTextToken("text", text));
                }
            }
            return;
        }

        if (!(node instanceof Element element)) {
            return;
        }

        if (isTooltipEntity(element)) {
            RichTextToken entityToken = parseEntity(element);
            if (entityToken != null) {
                tokens.add(entityToken);
            }
            return;
        }

        if (element.hasClass("tooltiptext")) {
            return;
        }

        if ("b".equals(element.tagName())) {
            maybeParseNumber(element, tokens);
            if (!looksLikeNumberToken(element)) {
                for (Node child : element.childNodes()) {
                    parseNode(child, tokens, true);
                }
            }
            return;
        }

        boolean nextBoldContext = boldContext || "strong".equals(element.tagName());
        for (Node child : element.childNodes()) {
            parseNode(child, tokens, nextBoldContext);
        }
    }

    private static boolean isTooltipEntity(Element element) {
        return "span".equals(element.tagName()) && element.hasClass("tooltip");
    }

    private static RichTextToken parseEntity(Element tooltip) {
        Element link = tooltip.selectFirst("a[href]");
        if (link == null) {
            return null;
        }

        String href = link.attr("href");
        String icon = null;
        Element image = tooltip.selectFirst("img[src]");
        if (image != null) {
            icon = image.attr("src");
        }

        Element nameNode = tooltip.selectFirst("b a span");
        String name;
        String color = null;
        if (nameNode != null) {
            name = nameNode.text();
            color = styleColor(nameNode.attr("style"));
        } else {
            Element nameLink = tooltip.selectFirst("b a");
            if (nameLink != null) {
                name = nameLink.text();
            } else {
                name = link.text();
            }
        }

        return new RichTextToken("entity", name)
                .with("href", href)
                .with("icon", icon)
                .with("color", color);
    }

    private static void maybeParseNumber(Element boldElement, List<RichTextToken> tokens) {
        if (!looksLikeNumberToken(boldElement)) {
            return;
        }
        Element colorSpan = boldElement.selectFirst("span");
        String value = colorSpan.text();
        String color = styleColor(colorSpan.attr("style"));
        tokens.add(new RichTextToken("number", value).with("color", color));
    }

    private static boolean looksLikeNumberToken(Element boldElement) {
        Element colorSpan = boldElement.selectFirst("span");
        if (colorSpan == null) {
            return false;
        }
        String text = colorSpan.text();
        return text.matches("[+-]?\\d+(?:\\.\\d+)?");
    }

    private static String styleColor(String style) {
        if (style == null || style.isBlank()) {
            return null;
        }
        String[] declarations = style.split(";");
        for (String declaration : declarations) {
            String[] keyValue = declaration.split(":", 2);
            if (keyValue.length == 2 && "color".equalsIgnoreCase(keyValue[0].trim())) {
                return keyValue[1].trim();
            }
        }
        return null;
    }

    private static String normalizeWhitespace(String raw) {
        return raw.replaceAll("\\s+", " ");
    }

    private static void mergeNeighborTextTokens(List<RichTextToken> tokens) {
        for (int i = 1; i < tokens.size(); i++) {
            RichTextToken previous = tokens.get(i - 1);
            RichTextToken current = tokens.get(i);
            if ("text".equals(previous.t) && "text".equals(current.t)) {
                previous.v = previous.v + current.v;
                tokens.remove(i);
                i--;
            }
        }
    }
}
