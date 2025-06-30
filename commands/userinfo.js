const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get user info'),
  permissions: [],
  async execute(interaction) {
    const member = interaction.member;
    const embed = new EmbedBuilder()
      .setTitle('👤 User Info')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Username', value: member.user.tag, inline: true },
        { name: 'User ID', value: member.id, inline: true },
        { name: 'Created On', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false },
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
      )
      .setColor(0x3498db)
      .setFooter({ text: `Requested by ${member.user.tag}` })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};