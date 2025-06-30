const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages (1-100)')
        .setRequired(true)),
  permissions: [PermissionsBitField.Flags.ManageMessages],
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      throw new Error('You need Manage Messages permission');
    }
    const amount = interaction.options.getInteger('amount');
    if (amount < 1 || amount > 100) throw new Error('Amount must be between 1 and 100');
    await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({ content: `🗑️ Cleared ${amount} messages.`, flags: 64 });
  },
};