import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/User.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async createUser(input: {
    email: string;
    password_hash: string;
    display_name?: string | null;
  }): Promise<User> {
    const user = this.repo.create({
      email: input.email,
      password_hash: input.password_hash,
      display_name: input.display_name ?? null,
      role: 'user',
      status: 'active',
    });
    return this.repo.save(user);
  }
}
