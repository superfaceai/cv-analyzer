import inquirer from 'inquirer';

export type Item<T> = {
  name: string;
  value: T;
};

export function chooseOne<T>(
  question: string,
  items: Item<T>[]
): Promise<T | undefined> {
  return inquirer
    .prompt({
      type: 'list',
      name: question,
      choices: items.map(item => {
        return {
          name: item.name,
          value: item.value,
        };
      }),
    })
    .then(answers => {
      return answers[question] as T;
    })
    .catch(error => {
      console.error(`${question} failed`, error);
      return undefined;
    });
}
