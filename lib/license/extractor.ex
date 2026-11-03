defmodule CKEditor5.License.Extractor do
  @moduledoc false

  alias CKEditor5.Errors

  @doc """
  Extracts distribution channel from license key.

  The `distributionChannel` claim can be `nil`, a single string or a list of strings.
  For a list, unknown entries are ignored and:

    * if both `"cloud"` and `"sh"` are listed, `nil` is returned, meaning every distribution is allowed,
    * if only one of them is listed, that channel is returned,
    * if none of them is listed, the key is rejected.
  """
  def distribution_channel("GPL"), do: {:ok, "sh"}

  def distribution_channel(key) do
    with parts when length(parts) == 3 <- String.split(key, "."),
         [_header, payload, _signature] <- parts,
         {:ok, decoded_payload} <- Base.url_decode64(payload, padding: false),
         {:ok, json} <- Jason.decode(decoded_payload),
         {:ok, channel} <- parse_distribution_channel(Map.get(json, "distributionChannel")) do
      {:ok, channel}
    else
      _ -> {:error, %Errors.InvalidLicenseKey{key: key}}
    end
  end

  defp parse_distribution_channel(nil), do: {:ok, nil}
  defp parse_distribution_channel(channel) when is_binary(channel), do: {:ok, channel}

  defp parse_distribution_channel(channels) when is_list(channels) do
    case {"cloud" in channels, "sh" in channels} do
      {true, true} -> {:ok, nil}
      {true, false} -> {:ok, "cloud"}
      {false, true} -> {:ok, "sh"}
      {false, false} -> :error
    end
  end

  defp parse_distribution_channel(_), do: :error
end
