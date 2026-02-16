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
                tokens.add(new RichTextToken(boldContext ? "bold" : "text", text));
            }
            return;
        }

        if (!(node instanceof Element element)) {
            return;
        }

        if (isTooltip(element)) {
            RichTextToken entityToken = parseEntity(element);
            if (entityToken != null) {
                tokens.add(entityToken);
            }
            return;
        }

        if (isTooltipText(element)) {
            return;
        }

        if (isBold(element)) {
            parseNumberMaybe(element, tokens);
            if (!isNumber(element)) {
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
            color = getColor(nameNode);
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

    private static void parseNumberMaybe(Element boldElement, List<RichTextToken> tokens) {
        if (!isNumber(boldElement)) {
            return;
        }
        Element colorSpan = boldElement.selectFirst("span");
        String value = colorSpan.text();
        String color = getColor(colorSpan);
        tokens.add(new RichTextToken("number", value).with("color", color));
    }

    private static String getColor(Element style_) {
        if (style_ == null) {
            return null;
        }
        String style = style_.attr("style");
        if (style.isBlank()) {
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

    // Check

    private static boolean isNumber(Element boldElement) {
        Element colorSpan = boldElement.selectFirst("span");
        if (colorSpan == null) {
            return false;
        }
        String text = colorSpan.text();
        return text.matches("[+-]?\\d+(?:\\.\\d+)?");
    }

    private static boolean isTooltip(Element element) {
        return "span".equals(element.tagName()) && element.hasClass("tooltip");
    }

    private static boolean isTooltipText(Element element) {
        return element.hasClass("tooltiptext");
    }

    private static boolean isBold(Element element) {
        return "b".equals(element.tagName());
    }


    // Tools

    private static String normalizeWhitespace(String raw) {
        return raw.replaceAll("\\s+", " ");
    }

    private static void mergeNeighborTextTokens(List<RichTextToken> tokens) {
        for (int i = 1; i < tokens.size(); i++) {
            RichTextToken previous = tokens.get(i - 1);
            RichTextToken current = tokens.get(i);
            if ("text".equals(previous.key) && "text".equals(current.key)) {
                previous.value = previous.value + current.value;
                tokens.remove(i);
                i--;
            }
        }
    }
}
