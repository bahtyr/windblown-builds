package org.example;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.firefox.FirefoxDriver;

import java.util.List;
import java.util.stream.Collectors;

public class Main {


    static void main() throws InterruptedException {

        WebDriver driver = new FirefoxDriver();
        driver.get(GiftsPage.URL);

        String section = "Scythe Gifts";

        WebElement table = driver.findElement(GiftsPage.tableOfSection(section));
        WebElement row = table.findElements(By.tagName("tr")).get(2);
        List<WebElement> td = row.findElements(By.tagName("td"));

        Gift a = new Gift();
        a.imageUrl = td.get(0).findElement(By.tagName("img")).getAttribute("src");
        a.name = td.get(0).getText();
        a.category = section.replace(" Gifts", "").trim();
        WebElement rowDescription = td.get(2);
        a.description = rowDescription.getText();
        a.richDescription = RichTextParser.parse(rowDescription).stream()
                .map(RichTextToken::toJsonLikeString)
                .collect(Collectors.joining(",", "[", "]"));
        System.out.print(a);

        driver.quit();

    }

}
