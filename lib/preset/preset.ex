defmodule CKEditor5.Preset do
  @moduledoc """
  Represents a CKEditor 5 preset configuration.
  """

  alias CKEditor5.{Cloud, CustomTranslations, License}

  @derive {Jason.Encoder, only: [:type, :config, :watchdog, :license, :custom_translations]}
  @type t :: %__MODULE__{
          type: atom(),
          config: map(),
          watchdog: map(),
          cloud: Cloud.t() | nil,
          license: License.t(),
          custom_translations: CustomTranslations.t() | nil
        }

  defstruct config: %{},
            type: :classic,
            cloud: nil,
            watchdog: nil,
            license: License.gpl(),
            custom_translations: nil

  @doc """
  Sets the type of the preset.
  """
  def of_type(%__MODULE__{} = preset, type) when is_atom(type) do
    %__MODULE__{preset | type: type}
  end

  @doc """
  Merges the current preset configuration with the provided overrides.
  """
  def merge(%__MODULE__{} = preset, overrides) when overrides in [nil, %{}] do
    preset
  end

  def merge(%__MODULE__{} = preset, overrides) when is_map(overrides) do
    %__MODULE__{
      type: overrides[:type] || preset.type,
      config: Map.merge(preset.config || %{}, overrides[:config] || %{}),
      watchdog: Map.merge(preset.watchdog || %{}, overrides[:watchdog] || %{}),
      license: overrides[:license] || preset.license,
      cloud: Cloud.merge(preset.cloud, overrides[:cloud]),
      custom_translations:
        CustomTranslations.merge(preset.custom_translations, overrides[:custom_translations])
    }
  end

  @doc """
  Checks if the preset has a Cloud configuration.
  Returns true if the cloud field is not nil, false otherwise.
  """
  def configured_cloud?(%__MODULE__{cloud: cloud}), do: cloud != nil
end
