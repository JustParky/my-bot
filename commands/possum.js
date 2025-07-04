const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('possum')
        .setDescription('Get Possum Exam questions and answers for a selected category.'),
    async execute(interaction) {
        try {
            const filePath = path.join(__dirname, '..', 'possum.json');
            const data = await fs.readFile(filePath, 'utf8');
            const possumData = JSON.parse(data);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_possum_category')
                .setPlaceholder('Select a Possum Exam category')
                .addOptions(
                    possumData.categories.map(category =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(category.label)
                            .setValue(category.value)
                    )
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('Possum Exam Categories')
                .setDescription('Please select a category from the dropdown menu to view the questions and answers.')
                .setColor('#0099ff');

            await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
        } catch (error) {
            console.error('Error executing possum command:', error);
            await interaction.reply({ content: 'There was an error loading the Possum Exam categories. Please try again later.', flags: 64 });
        }
    },
    async handleInteraction(interaction) {
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'select_possum_category') return;

        try {
            const filePath = path.join(__dirname, '..', 'possum.json');
            const data = await fs.readFile(filePath, 'utf8');
            const possumData = JSON.parse(data);

            const selectedCategoryValue = interaction.values[0];
            const category = possumData.categories.find(cat => cat.value === selectedCategoryValue);

            if (!category) {
                await interaction.update({ content: 'Invalid category selected.', components: [], flags: 64 });
                return;
            }

            let description = `**${category.message}**\n\n**Possible Questions and Answers:**\n`;
            if (category.questions.length === 0) {
                description = category.message;
            } else {
                category.questions.forEach((q, index) => {
                    const questionNumber = index + 1; // Start numbering at 1
                    const questionEntry = `${questionNumber}. ${q.question}\n   - **Answer ${questionNumber}**: ${q.answer}\n`;
                    if ((description + questionEntry).length < 4000) {
                        description += questionEntry;
                    } else {
                        description += '*...and more*';
                        return;
                    }
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`Possum: ${category.name} Exam Questions`)
                .setDescription(description)
                .setColor('#0099ff');

            await interaction.update({ embeds: [embed], components: [], flags: 64 });
        } catch (error) {
            console.error('Error handling possum category selection:', error);
            await interaction.update({ content: 'There was an error loading the category questions. Please try again.', components: [], flags: 64 });
        }
    },
};