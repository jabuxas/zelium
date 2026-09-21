export interface BaseRepository<
  T,
  CreateDto = Partial<T>,
  UpdateDto = Partial<T>,
> {
  list(params?: Record<string, unknown>): Promise<T[]>;
  getById(id: number): Promise<T>;
  create(data: CreateDto): Promise<T>;
  update(id: number, data: UpdateDto): Promise<T>;
  delete(id: number): Promise<void>;
}
