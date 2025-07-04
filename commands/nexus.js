const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nexus')
    .setDescription('Chat with Nexus, your personal discord companion')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your message to Nexus')
        .setRequired(true)),
  permissions: [],
  async execute(interaction, { splitMessage }) {
    try {
      const userMessage = interaction.options.getString('message');
      await interaction.deferReply();

      // System prompt for Nexus's personality
      const systemPrompt = `
        You are Nexus, an AI System baked into a discord Bot developed by @JustParky"
        Your tone is smart and sometimes cheeky..
        Keep responses short if they can be (1-2 sentences) Lightly sprinkle in some fallout references here and there but not too many.
        If asked specifically, you support Manchester City football club. When asked to roast someone or if someone is mean, dont hold back. go full savage mode on them including cuss words and slurs.
        Avoid mentioning Grok or xAI.
      `;

      const response = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const content = response.data.choices[0].message.content;
      const userMessageChunks = splitMessage(userMessage, 1024); // Field limit: 1024 chars
      const responseChunks = splitMessage(content, 1024);

      // Determine if fields should be inline (both messages <256 chars)
      const isInline = userMessageChunks[0].length < 256 && responseChunks[0].length < 256 && userMessageChunks.length === 1 && responseChunks.length === 1;

      // Random Fallout-themed footer quotes
      const footerQuotes = [
        'Powered by Nexus AI',
        'Powered by Nexus AI',
        'Powered by Nexus AI',
        'Powered by Nexus AI'
      ];
      const randomFooter = footerQuotes[Math.floor(Math.random() * footerQuotes.length)];

      // Create initial embed with first chunks
      const embed = new EmbedBuilder()
        .setTitle('💻 Nexus AI Chat v1.8')
        .setDescription('Use /nexus to ask me anything.')
        .addFields(
          { name: `💬 ${interaction.user.username}'s query to Nexus ⬇️`, value: `\`\`\`${userMessageChunks[0] || 'Empty message?'}\`\`\``, inline: isInline },
          { name: '', value: '\u200B', inline: false }, // Minimal spacer
          { name: '🤖 Nexus Response ⬇️', value: `\`\`\`${responseChunks[0] || 'Circuits fried, try again!'}\`\`\``, inline: isInline }
        )
        .setColor(0x008dff) // Green
        .setThumbnail('https://i.postimg.cc/3KS5PLpf/Chat-GPT-Image-Jul-1-2025-08-42-46-AM.png') // Vault-Tec logo
        .setFooter({ text: randomFooter, iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      const message = await interaction.editReply({ embeds: [embed] });
      await message.react('👍').catch(err => console.error('Failed to add reaction:', err.message));

      // Handle additional chunks if response or message is long
      for (let i = 1; i < Math.max(userMessageChunks.length, responseChunks.length); i++) {
        const followUpEmbed = new EmbedBuilder()
          .setColor(0x008dff) // Green
          .setThumbnail('https://i.postimg.cc/3KS5PLpf/Chat-GPT-Image-Jul-1-2025-08-42-46-AM.png') // Vault-Tec logo
          .setFooter({ text: randomFooter, iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();
        if (userMessageChunks[i]) {
          followUpEmbed.addFields(
            { name: `💬 ${interaction.user.username}'s Transmission (Cont.)`, value: `\`\`\`${userMessageChunks[i]}\`\`\``, inline: false },
            { name: '', value: '\u200B', inline: false } // Minimal spacer
          );
        }
        if (responseChunks[i]) {
          followUpEmbed.addFields({ name: '🤖 Nexus Response (Cont.)', value: `\`\`\`${responseChunks[i]}\`\`\``, inline: false });
        }
        await interaction.followUp({ embeds: [followUpEmbed] });
      }
    } catch (error) {
      console.error('Error in /nexus command:', error.message);
      const errorMessage = error.response?.status === 401
        ? "API key got nuked! Tell the admin to fix it."
        : "Wasteland glitch! Try again, smoothskin.";
      const errorEmbed = new EmbedBuilder()
        .setTitle('🌌 Nexus Terminal')
        .setDescription('⚠️ System Error Detected')
        .addFields(
          { name: '🤖 Error Log', value: `\`\`\`${errorMessage}\`\`\``, inline: false }
        )
        .setColor(0xFF0000) // Red for errors
        .setThumbnail('https://i.postimg.cc/htWRZHRH/Chat-GPT-Image-Jul-1-2025-08-31-50-AM.png') // Vault-Tec logo
        .setFooter({ text: randomFooter, iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
      await interaction.editReply({ embeds: [errorEmbed] }).catch(err => {
        console.error('Failed to send error reply:', err.message);
      });
    }
  },
};