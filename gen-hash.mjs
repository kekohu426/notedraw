import { hash } from '@node-rs/argon2';
const password = await hash('admin123');
console.log(password);
