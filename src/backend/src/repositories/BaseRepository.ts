import { CreationAttributes, Model, ModelStatic, Op } from "sequelize";

export class BaseRepository<T extends Model> {
  constructor(protected readonly model: ModelStatic<T>) {}

  findAll(): Promise<T[]> {
    return this.model.findAll();
  }

  findById(id: number): Promise<T | null> {
    return this.model.findByPk(id);
  }

  findDeleted(): Promise<T[]> {
    return this.model.findAll({
      paranoid: false,
      where: { deletedAt: { [Op.not]: null } } as any,
    });
  }

  create(data: CreationAttributes<T>): Promise<T> {
    return this.model.sequelize!.transaction(transaction => this.model.create(data, { transaction }));
  }

  async update(id: number, data: Partial<CreationAttributes<T>>): Promise<T | null> {
    return this.model.sequelize!.transaction(async transaction => {
      const instance = await this.model.findByPk(id, { transaction });
      if (!instance) return null;
      return instance.update(data, { transaction });
    });
  }

  async delete(id: number): Promise<boolean> {
    return this.model.sequelize!.transaction(async transaction => {
      const instance = await this.model.findByPk(id, { transaction });
      if (!instance) return false;
      await instance.destroy({ transaction });
      return true;
    });
  }

  async restore(id: number): Promise<T | null> {
    return this.model.sequelize!.transaction(async transaction => {
      const instance = await this.model.findByPk(id, { paranoid: false, transaction });
      if (!instance) return null;
      await instance.restore({ transaction });
      return instance;
    });
  }
}
