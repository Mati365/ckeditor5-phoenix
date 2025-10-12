defmodule CKEditor5.License do
  @moduledoc """
  Provides functionality to manage CKEditor 5 license keys.
  """

  alias CKEditor5.License.Extractor

  use Memoize

  @env_license_key_name "CKEDITOR5_LICENSE_KEY"
  @derive {Jason.Encoder, only: [:key]}
  @enforce_keys [:key, :distribution_channel]
  @type t :: %__MODULE__{
          key: String.t(),
          distribution_channel: String.t() | nil
        }

  defstruct [:key, :distribution_channel]

  @doc """
  Creates a new License struct with the given license key.
  Automatically extracts the distribution channel from the license key.
  Returns {:ok, %License{}} for valid keys or {:error, error} for invalid keys.
  """
  def new(%__MODULE__{} = license) do
    {:ok, license}
  end

  defmemo new(key) do
    case Extractor.distribution_channel(key) do
      {:error, error} ->
        {:error, error}

      {:ok, distribution_channel} ->
        {:ok,
         %__MODULE__{
           key: key,
           distribution_channel: distribution_channel
         }}
    end
  end

  @doc """
  Creates a new License struct with the given license key.
  Raises an error if the key is invalid.
  """
  def new!(key) do
    case new(key) do
      {:ok, license} -> license
      {:error, error} -> raise error
    end
  end

  @doc """
  Creates a new GPL license struct.
  This license is compatible with all distribution channels.
  """
  @spec gpl() :: CKEditor5.License.t()
  def gpl,
    do: %__MODULE__{
      key: "GPL",
      distribution_channel: "sh"
    }

  @doc """
  Returns the default license key from environment variable or "GPL".
  """
  def env_license_or_gpl do
    case System.get_env(@env_license_key_name) do
      nil -> {:ok, gpl()}
      key -> new(key)
    end
  end

  @doc """
  Formats the license key for safe display by truncating long keys.
  """
  def format_key(%__MODULE__{key: key}) do
    format_key(key)
  end

  def format_key(key) when is_binary(key) do
    case String.length(key) do
      len when len > 8 -> String.slice(key, 0, 8) <> "..."
      _ -> key
    end
  end
end
