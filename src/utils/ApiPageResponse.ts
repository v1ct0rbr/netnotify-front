export type ApiPageResponse<T> = {
    content: T[];
    totalElements: number;
    totalPages: number;
    isEmpty: boolean;
    last: boolean;
    first: boolean;
    numberOfElements: number;
    size: number;
    number: number;
    pageable: {
       sort: {
            empty: boolean;
            unsorted: boolean;
            sorted: boolean;
       };
       pageNumber: number;
       pageSize: number;
       offset: number;
       paged: boolean;
       unpaged: boolean;
    };    
}