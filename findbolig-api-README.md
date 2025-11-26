# Guide to the Findbolig API

## How to get list of pending accepted offers

1. call `GET /api/search/offers` with the following body:
```json
{
  "search": null,
  "filters": {},
  "pageSize": 2147483647,
  "page": 0,
  "orderDirection": "desc",
  "orderBy": "created"
}
```

2. filter the results to only include offers with state `Finished` and