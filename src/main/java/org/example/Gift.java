package org.example;

public class Gift {
    String imageUrl;
    String name;
    String category;
    String description;

    @Override
    public String toString() {
        return "Gift{" +
                "imageUrl='" + imageUrl + '\'' +
                ", name='" + name + '\'' +
                ", category='" + category + '\'' +
                ", description='" + description + '\'' +
                '}';
    }
}
