const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Poll question')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes (default 5)')
        .setRequired(false)),
  permissions: [],
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const duration = (interaction.options.getInteger('duration') || 5) * 60 * 1000;
    const embed = new EmbedBuilder()
      .setTitle('📊 Poll')
      .setDescription(question)
      .setColor(0xffff00)
      .setFooter({ text: `Poll ends in ${duration / 60000} minutes` });
    const message = await interaction.reply({ embeds: [embed], components: [require('../index').pollButtons], fetchReply: true });
    const votes = { yes: new Set(), no: new Set() };
    const collector = message.createMessageComponentCollector({ time: duration });
    collector.on('collect', async (i) => {
      if (i.customId === 'yes' || i.customId === 'no') {
        const otherOption = i.customId === 'yes' ? 'no' : 'yes';
        if (votes[otherOption].has(i.user.id)) {
          votes[otherOption].delete(i.user.id);
        }
        if (votes[i.customId].has(i.user.id)) {
          return i.reply({ content: `❌ You already voted ${i.customId}!`, flags: 64 });
        }
        votes[i.customId].add(i.user.id);
        await i.reply({ content: `You voted **${i.customId === 'yes' ? 'Yes' : 'No'}**!`, flags: 64 });
      }
    });
    collector.on('end', async () => {
      const resultEmbed = new EmbedBuilder()
        .setTitle('📊 Poll Results')
        .setDescription(question)
        .addFields(
          { name: 'Yes', value: `${votes.yes.size} votes`, inline: true },
          { name: 'No', value: `${votes.no.size} votes`, inline: true },
        )
        .setColor(0xffff00)
        .setTimestamp();
      await message.edit({ embeds: [resultEmbed], components: [] });
    });
  },
};