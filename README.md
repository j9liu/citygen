# Road Generation
**By Janine Liu / jliu99**

# External Resources

In addition to the class lectures and powerpoints, I consulted a few external resources for this project:
https://stackoverflow.com/questions/36809778/typescript-interface-downcasting
https://stackoverflow.com/questions/44078205/how-to-check-the-object-type-on-runtime-in-typescript
# Live GitHub demo
https://j9liu.github.io/citygen/

# Integration with Road Network

This began with the road generation shown here. like its road-creating counterpart, the We define the space in which the roads are initially created as "cityspace." The bounds of cityspace are defined from (0, 0) in the bottom left corner to a specified (width, height) in the upper right corner. Our road generator operates within the coordinates of this cityspace to produce roads, then uses its own projection matrix to transform the network cityspace coordinates (from (0, 0) and (width, height)) to screen coordinates (from (-1, -1) and (1, 1)), such that they can be displayed in the 2D view as shown.

The CityGenerator operates within a grid of 1x1 cells, the number of which
 * is equivalent to the grid's area.

In order to reduce the amount of time it takes to check if a road intersects another road, we sort the edges in the .

![](grid.png)

# Building Algorithm

# Aesthetic Features
