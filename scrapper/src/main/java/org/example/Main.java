package org.example;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.firefox.FirefoxDriver;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class Main {

    static ArrayList<Gift> gifts = new ArrayList<>();

    static void main() throws Exception {
        WebDriver driver = new FirefoxDriver();
        driver.get(GiftsPage.URL);
        Thread.sleep(2000);

        for (String section : GiftsPage.SECTIONS) {
            WebElement table = driver.findElement(GiftsPage.tableOfSection(section));
            List<WebElement> rows = table.findElements(By.tagName("tr"));
            for (WebElement row : rows) {
                gifts.add(parseGift(row, section));
            }
        }

        System.out.println(gifts);
        writeToJson(gifts);

        driver.quit();
    }

    static Gift parseGift(WebElement row, String section) {
        Gift gift = new Gift();
        List<WebElement> td = row.findElements(By.tagName("td"));
        gift.imageUrl = td.get(0).findElement(By.tagName("img")).getAttribute("src");
        gift.name = td.get(1).getText();
        gift.category = section.replace(" Gifts", "").trim();
        WebElement rowDescription = td.get(2);
        gift.description = rowDescription.getText();
        gift.richDescription = RichTextParser.parse(rowDescription).stream()
                .map(RichTextToken::toJsonLikeString)
                .collect(Collectors.joining(",", "[", "]"));
        return gift;
    }

    static void writeToJson(List<Gift> gifts) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        mapper.writeValue(new File("gifts.json"), gifts);
    }

}
