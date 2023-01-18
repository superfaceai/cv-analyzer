const inquirer = require('inquirer');

exports.chooseOne = (question, items) => {
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
      return answers[question];
    })
    .catch(error => {
      console.error(`${question} failed`, error);
      return undefined;
    });
};
