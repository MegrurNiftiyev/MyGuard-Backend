# Route Ordering Rule

When creating or modifying route files (`*.routes.ts`), you MUST order the HTTP methods in the following strict order for readability and consistency:

1. `GET`
2. `POST`
3. `PATCH`
4. `PUT`
5. `DELETE`

If there are multiple routes with the same HTTP method (e.g., multiple `GET` endpoints), group them all together sequentially before moving on to the next HTTP method. Do not interleave different HTTP methods (e.g. do not put a POST between two GETs).
